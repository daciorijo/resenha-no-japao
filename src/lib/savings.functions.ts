import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Open Finance is not active. This endpoint records a request, but never
 * fetches or fabricates balances. Bank credentials must stay server-side.
 */
export const requestBalanceSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const message =
      "Sincronização bancária indisponível no momento. Informe seu saldo manualmente.";

    const { error } = await context.supabase.from("sync_requests").insert({
      user_id: context.userId,
      status: "unavailable",
      message,
    });

    if (error) {
      return {
        synced: false,
        message: "Não foi possível registrar a solicitação. Tente novamente mais tarde.",
      };
    }

    return { synced: false, message };
  });
