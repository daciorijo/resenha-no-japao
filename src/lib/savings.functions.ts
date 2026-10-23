import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Request a bank balance refresh. Open Finance (e.g. Pluggy) credentials live only
 * in server env (PLUGGY_CLIENT_ID / PLUGGY_CLIENT_SECRET). Until they are configured
 * and compatibility is verified, the request is recorded and no balance is invented.
 */
export const requestBalanceSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const configured = Boolean(process.env["PLUGGY_CLIENT_ID"] && process.env["PLUGGY_CLIENT_SECRET"]);
    const message = configured
      ? "Integração configurada, mas a sincronização ainda não foi habilitada."
      : "Integração bancária ainda não disponível. Atualize o saldo manualmente.";
    await context.supabase
      .from("sync_requests")
      .insert({ user_id: context.userId, status: "unavailable", message });
    return { synced: false, message };
  });

