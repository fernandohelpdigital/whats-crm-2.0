-- Enum for broadcast status
CREATE TYPE broadcast_status AS ENUM ('draft', 'running', 'paused', 'completed', 'failed');

-- Broadcasts table
CREATE TABLE public.broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  status broadcast_status NOT NULL DEFAULT 'draft',
  delay_preset TEXT NOT NULL DEFAULT 'medium',
  delay_min_seconds INT NOT NULL DEFAULT 20,
  delay_max_seconds INT NOT NULL DEFAULT 50,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  contact_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_targets INT NOT NULL DEFAULT 0,
  sent_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  read_count INT NOT NULL DEFAULT 0,
  replied_count INT NOT NULL DEFAULT 0,
  current_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own broadcasts" ON public.broadcasts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own broadcasts" ON public.broadcasts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own broadcasts" ON public.broadcasts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own broadcasts" ON public.broadcasts FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_broadcasts_updated_at
  BEFORE UPDATE ON public.broadcasts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Broadcast logs table
CREATE TABLE public.broadcast_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL REFERENCES public.broadcasts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  contact_id TEXT,
  contact_name TEXT,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  message_text TEXT,
  message_id TEXT,
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_broadcast_logs_broadcast ON public.broadcast_logs(broadcast_id);
CREATE INDEX idx_broadcast_logs_message_id ON public.broadcast_logs(message_id);

ALTER TABLE public.broadcast_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own broadcast logs" ON public.broadcast_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own broadcast logs" ON public.broadcast_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own broadcast logs" ON public.broadcast_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own broadcast logs" ON public.broadcast_logs FOR DELETE USING (auth.uid() = user_id);

-- Add broadcast feature flag
ALTER TABLE public.user_feature_flags ADD COLUMN IF NOT EXISTS broadcast BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.instance_feature_flags ADD COLUMN IF NOT EXISTS broadcast BOOLEAN DEFAULT true;

-- Update handle_new_user to include broadcast flag
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  INSERT INTO public.user_feature_flags (user_id, dashboard, chat, kanban, proposals, followup, contacts, extractor, broadcast)
    VALUES (NEW.id, true, true, true, false, false, true, false, true);
  RETURN NEW;
END;
$function$;