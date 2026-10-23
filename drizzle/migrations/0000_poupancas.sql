
-- Only the two members may sign up
CREATE OR REPLACE FUNCTION public.restrict_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF lower(NEW.email) NOT IN ('derio@resenha.app','bauce@resenha.app') THEN
    RAISE EXCEPTION 'Cadastro não permitido';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER restrict_signup_trg BEFORE INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.restrict_signup();

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  bank_name text NOT NULL,
  bank_code text NOT NULL,
  account_type text NOT NULL DEFAULT 'Poupança tradicional',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF lower(NEW.email) = 'derio@resenha.app' THEN
    INSERT INTO public.profiles(id,name,bank_name,bank_code) VALUES (NEW.id,'Derio','Banco do Brasil','bb');
  ELSE
    INSERT INTO public.profiles(id,name,bank_name,bank_code) VALUES (NEW.id,'Bauce','Banco Inter','inter');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.trip_goal (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  title text NOT NULL DEFAULT 'Viagem ao Japão 2027/28',
  target_amount numeric(14,2),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
INSERT INTO public.trip_goal(id) VALUES (1);
GRANT SELECT, UPDATE ON public.trip_goal TO authenticated;
GRANT ALL ON public.trip_goal TO service_role;
ALTER TABLE public.trip_goal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read goal" ON public.trip_goal FOR SELECT TO authenticated USING (true);
CREATE POLICY "members update goal" ON public.trip_goal FOR UPDATE TO authenticated USING (true) WITH CHECK (updated_by = auth.uid() AND (target_amount IS NULL OR target_amount >= 0));

CREATE TABLE public.balance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','synced')),
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.balance_records(user_id, recorded_at DESC);
GRANT SELECT, INSERT ON public.balance_records TO authenticated;
GRANT ALL ON public.balance_records TO service_role;
ALTER TABLE public.balance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read balances" ON public.balance_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "own manual balance" ON public.balance_records FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND source = 'manual');

-- Open Finance connection metadata (no bank passwords ever stored). Written only by the server.
CREATE TABLE public.bank_connections (
  user_id uuid PRIMARY KEY,
  provider text NOT NULL DEFAULT 'pluggy',
  external_item_id text,
  status text NOT NULL DEFAULT 'not_connected' CHECK (status IN ('not_connected','pending_consent','active','error','revoked')),
  consented_at timestamptz,
  last_sync_at timestamptz,
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bank_connections TO authenticated;
GRANT ALL ON public.bank_connections TO service_role;
ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own connection" ON public.bank_connections FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.sync_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.sync_requests TO authenticated;
GRANT ALL ON public.sync_requests TO service_role;
ALTER TABLE public.sync_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read requests" ON public.sync_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "own request" ON public.sync_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
