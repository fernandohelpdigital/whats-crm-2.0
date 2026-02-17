
-- 1. Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.deal_status AS ENUM (
  'lead_capturado', 'contato_inicial', 'diagnostico_levantamento',
  'proposta_construcao', 'proposta_enviada', 'negociacao',
  'fechado_aprovado', 'em_execucao', 'entrega_homologacao',
  'pos_venda', 'em_followup', 'perdido'
);
CREATE TYPE public.task_status AS ENUM ('pending', 'sent', 'cancelled');
CREATE TYPE public.task_type AS ENUM ('whatsapp', 'call', 'email');

-- 2. Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  instance_name TEXT,
  base_url TEXT DEFAULT 'https://api.automacaohelp.com.br',
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 3. User Roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- 4. has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- 5. updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Auto-create profile + role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Deals
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  company TEXT NOT NULL DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  value NUMERIC DEFAULT 0,
  status public.deal_status NOT NULL DEFAULT 'lead_capturado',
  date TIMESTAMPTZ DEFAULT now(),
  contact_id TEXT,
  avatar_url TEXT,
  phone TEXT,
  email TEXT,
  zip_code TEXT,
  address TEXT,
  number_address TEXT,
  complement TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  source TEXT,
  average_bill_value NUMERIC,
  budget_presented BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deals" ON public.deals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own deals" ON public.deals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own deals" ON public.deals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own deals" ON public.deals FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Follow-up Tasks
CREATE TABLE public.follow_up_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contact_id TEXT,
  contact_name TEXT NOT NULL,
  avatar_url TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  status public.task_status NOT NULL DEFAULT 'pending',
  type public.task_type NOT NULL DEFAULT 'whatsapp',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.follow_up_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks" ON public.follow_up_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON public.follow_up_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON public.follow_up_tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON public.follow_up_tasks FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_follow_up_tasks_updated_at BEFORE UPDATE ON public.follow_up_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Proposals
CREATE TABLE public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contact_name TEXT,
  contact_number TEXT,
  project_title TEXT,
  service_type TEXT,
  description TEXT,
  tech_stack TEXT,
  timeline TEXT,
  setup_cost NUMERIC DEFAULT 0,
  monthly_cost NUMERIC DEFAULT 0,
  hours_estimated NUMERIC DEFAULT 0,
  address_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own proposals" ON public.proposals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own proposals" ON public.proposals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own proposals" ON public.proposals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own proposals" ON public.proposals FOR DELETE USING (auth.uid() = user_id);

-- 10. Instance Feature Flags
CREATE TABLE public.instance_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_name TEXT UNIQUE NOT NULL,
  dashboard BOOLEAN DEFAULT true,
  kanban BOOLEAN DEFAULT true,
  proposals BOOLEAN DEFAULT true,
  followup BOOLEAN DEFAULT true,
  chat BOOLEAN DEFAULT true
);
ALTER TABLE public.instance_feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read flags" ON public.instance_feature_flags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert flags" ON public.instance_feature_flags FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update flags" ON public.instance_feature_flags FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete flags" ON public.instance_feature_flags FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 11. System Branding
CREATE TABLE public.system_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_name TEXT NOT NULL DEFAULT 'HelpDigital CRM',
  primary_color TEXT NOT NULL DEFAULT '#F05A22'
);
ALTER TABLE public.system_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read branding" ON public.system_branding FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert branding" ON public.system_branding FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update branding" ON public.system_branding FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
