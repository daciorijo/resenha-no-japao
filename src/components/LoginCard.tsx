import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const USERS = [
  { name: "Derio", email: "derio@resenha.app" },
  { name: "Bauce", email: "bauce@resenha.app" },
];

export function LoginCard() {
  const [who, setWho] = useState(USERS[0]!);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: who.email, password });
    setLoading(false);
    if (error) {
      setError("Não foi possível entrar. Verifique sua senha.");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-card p-4 shadow-card">
      <p className="text-sm font-semibold">Quem é você?</p>
      <div className="grid grid-cols-2 gap-2">
        {USERS.map((u) => (
          <button
            type="button"
            key={u.name}
            onClick={() => setWho(u)}
            className={cn(
              "rounded-xl border py-3 font-semibold transition-colors",
              who.name === u.name
                ? "border-primary bg-primary-soft text-primary"
                : "bg-card text-foreground",
            )}
          >
            {u.name}
          </button>
        ))}
      </div>
      <input
        type="password"
        placeholder="Senha"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-xl border bg-secondary px-4 py-3 outline-none focus:border-primary"
        required
        minLength={6}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        disabled={loading}
        className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-60"
      >
        {loading ? "..." : "Entrar"}
      </button>
    </form>
  );
}
