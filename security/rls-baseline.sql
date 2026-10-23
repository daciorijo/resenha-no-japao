-- Security baseline for Resenha no Japão.
-- Review in Supabase SQL editor before deploying; no existing data is deleted.
-- Only the two registered trip participants should be allowed to access data.
-- IMPORTANT: profiles must be provisioned only for approved auth.users IDs.
-- Never expose a service_role key in the browser.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_goal ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_trip_member() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid())); $;
REVOKE ALL ON FUNCTION public.is_trip_member() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_trip_member() TO authenticated;

-- Remove overly broad existing policies manually before applying this baseline.
-- These policies intentionally do not grant anonymous access.
CREATE POLICY "trip_members_read_profiles" ON public.profiles
FOR SELECT TO authenticated
USING (
  (SELECT public.is_trip_member())
);

CREATE POLICY "trip_members_read_balances" ON public.balance_records
FOR SELECT TO authenticated
USING (
  (SELECT public.is_trip_member())
);

CREATE POLICY "owner_insert_balance" ON public.balance_records
FOR INSERT TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND source = 'manual'
  AND amount >= 0
  AND (SELECT public.is_trip_member())
);

CREATE POLICY "owner_read_bank_connection" ON public.bank_connections
FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

CREATE POLICY "owner_read_sync_requests" ON public.sync_requests
FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

CREATE POLICY "owner_request_sync" ON public.sync_requests
FOR INSERT TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND status = 'unavailable'
  AND (SELECT public.is_trip_member())
);

CREATE POLICY "trip_members_read_goal" ON public.trip_goal
FOR SELECT TO authenticated
USING (
  (SELECT public.is_trip_member())
);

CREATE POLICY "trip_members_update_goal" ON public.trip_goal
FOR UPDATE TO authenticated
USING (
  (SELECT public.is_trip_member())
)
WITH CHECK (
  updated_by = (SELECT auth.uid())
  AND (SELECT public.is_trip_member())
);

-- Additional production requirements:
-- 1. Revoke public table grants and audit any existing policies.
-- 2. Use server-only service-role credentials for provider sync.
-- 3. Validate provider ownership and consent before accepting synced balances.
-- 4. Restrict signups to the two approved participants.
