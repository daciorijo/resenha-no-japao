// Tela inicial: entra com a senha e mostra as poupanças de Derio e Bauce.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { LoginCard } from "@/components/LoginCard";
import { SavingsPanel } from "@/components/SavingsPanel";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Resenha no Japão — Nossas Poupanças" },
      { name: "description", content: "Acompanhe as poupanças de Derio e Bauce para a viagem ao Japão." },
      { property: "og:title", content: "Resenha no Japão" },
      { property: "og:description", content: "Acompanhe as poupanças da viagem ao Japão 2027/28." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <div className="mx-auto min-h-screen max-w-xl px-4 py-6">
      <header className="mb-6 flex items-center gap-3">
        <span className="size-8 rounded-full bg-primary" aria-hidden />
        <div className="flex-1">
          <h1 className="font-serif text-2xl text-foreground">Resenha no Japão</h1>
          <p className="text-xs text-muted-foreground">日本旅行 · 2027/28</p>
        </div>
        {session && (
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-sm text-muted-foreground hover:text-primary"
          >
            Sair
          </button>
        )}
      </header>
      {!ready ? null : session ? <SavingsPanel userId={session.user.id} /> : <LoginCard />}
    </div>
  );
}
