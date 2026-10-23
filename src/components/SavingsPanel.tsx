import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { requestBalanceSync } from "@/lib/savings.functions";
import { cn } from "@/lib/utils";

type Profile = { id: string; name: string; bank_name: string; bank_code: string; account_type: string };
type Balance = { user_id: string; amount: number; source: string; recorded_at: string };
type Goal = { title: string; target_amount: number | null };

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const when = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

export function SavingsPanel({ userId }: { userId: string }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [latest, setLatest] = useState<Record<string, Balance>>({});
  const [goal, setGoal] = useState<Goal | null>(null);
  const [editing, setEditing] = useState<"balance" | "goal" | null>(null);
  const [value, setValue] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const sync = useServerFn(requestBalanceSync);

  const load = useCallback(async () => {
    const [p, b, g] = await Promise.all([
      supabase.from("profiles").select("*").order("name", { ascending: false }),
      supabase.from("balance_records").select("*").order("recorded_at", { ascending: false }).limit(50),
      supabase.from("trip_goal").select("title,target_amount").eq("id", 1).single(),
    ]);
    setProfiles((p.data as Profile[]) ?? []);
    const map: Record<string, Balance> = {};
    for (const r of (b.data as Balance[]) ?? []) if (!map[r.user_id]) map[r.user_id] = r;
    setLatest(map);
    setGoal((g.data as Goal) ?? null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const total = Object.values(latest).reduce((s, r) => s + Number(r.amount), 0);
  const target = goal?.target_amount ? Number(goal.target_amount) : null;
  const pct = target ? Math.min(100, (total / target) * 100) : 0;
  const lastUpdate = Object.values(latest).sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))[0];

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(value.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(n) || n < 0) return setNotice("Valor inválido.");
    const res =
      editing === "balance"
        ? await supabase.from("balance_records").insert({ user_id: userId, amount: n, source: "manual" })
        : await supabase
            .from("trip_goal")
            .update({ target_amount: n, updated_by: userId, updated_at: new Date().toISOString() })
            .eq("id", 1);
    if (res.error) return setNotice("Não foi possível salvar.");
    setEditing(null);
    setValue("");
    setNotice(null);
    load();
  }

  async function requestSync() {
    setNotice("Solicitando...");
    const r = await sync();
    setNotice(r.message);
  }

  return (
    <section className="space-y-4">
      <h2 className="font-serif text-xl">Nossas Poupanças</h2>

      <div className="rounded-2xl border bg-card p-5 shadow-card">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Total conjunto</p>
        <p className="mt-1 font-serif text-3xl">{Object.keys(latest).length ? brl(total) : "—"}</p>
        <div className="mt-4">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{goal?.title}</span>
            <span>{target ? `${pct.toFixed(0)}% de ${brl(target)}` : "Meta não definida"}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          <button
            onClick={() => {
              setEditing("goal");
              setValue(target ? String(target) : "");
            }}
            className="mt-2 text-xs text-primary"
          >
            {target ? "Alterar meta" : "Definir meta"}
          </button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Última atualização: {lastUpdate ? when(lastUpdate.recorded_at) : "nenhum saldo registrado"}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {profiles.map((p) => {
          const b = latest[p.id];
          const mine = p.id === userId;
          return (
            <div key={p.id} className="rounded-2xl border bg-card p-4 shadow-card">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "grid size-8 place-items-center rounded-lg text-[10px] font-bold",
                    p.bank_code === "bb"
                      ? "bg-bank-bb text-bank-bb-foreground"
                      : "bg-bank-inter text-bank-inter-foreground",
                  )}
                >
                  {p.bank_code === "bb" ? "BB" : "inter"}
                </span>
                <div>
                  <p className="font-semibold leading-tight">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.bank_name} · {p.account_type}
                  </p>
                </div>
              </div>
              <p className="mt-3 font-serif text-2xl">{b ? brl(Number(b.amount)) : "—"}</p>
              {b ? (
                <div className="mt-1 flex items-center gap-2 text-xs">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 font-medium",
                      b.source === "synced" ? "bg-success-soft text-success" : "bg-warning-soft text-warning",
                    )}
                  >
                    {b.source === "synced" ? "Sincronizado com o banco" : "Informado manualmente"}
                  </span>
                  <span className="text-muted-foreground">{when(b.recorded_at)}</span>
                </div>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">Saldo ainda não informado</p>
              )}
              {mine && (
                <button
                  onClick={() => {
                    setEditing("balance");
                    setValue("");
                  }}
                  className="mt-3 w-full rounded-xl border border-primary py-2 text-sm font-semibold text-primary"
                >
                  Atualizar meu saldo
                </button>
              )}
            </div>
          );
        })}
      </div>

      {editing && (
        <form onSubmit={save} className="space-y-3 rounded-2xl border bg-card p-4 shadow-card">
          <p className="text-sm font-semibold">
            {editing === "balance" ? "Saldo atual da minha poupança (R$)" : "Meta da viagem (R$)"}
          </p>
          <input
            autoFocus
            inputMode="decimal"
            placeholder="0,00"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded-xl border bg-secondary px-4 py-3 outline-none focus:border-primary"
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditing(null)} className="flex-1 rounded-xl border py-2 text-sm">
              Cancelar
            </button>
            <button className="flex-1 rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground">
              Salvar
            </button>
          </div>
        </form>
      )}

      <button
        onClick={requestSync}
        className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground"
      >
        Solicitar atualização dos saldos
      </button>
      {notice && <p className="text-center text-sm text-muted-foreground">{notice}</p>}
    </section>
  );
}
