
-- Add contacts and extractor columns to user_feature_flags
ALTER TABLE public.user_feature_flags ADD COLUMN IF NOT EXISTS contacts boolean NOT NULL DEFAULT true;
ALTER TABLE public.user_feature_flags ADD COLUMN IF NOT EXISTS extractor boolean NOT NULL DEFAULT false;

-- Update handle_new_user to set new defaults: dash=true, contacts=true, chat=true, kanban=true, rest=false
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  INSERT INTO public.user_feature_flags (user_id, dashboard, chat, kanban, proposals, followup, contacts, extractor)
    VALUES (NEW.id, true, true, true, false, false, true, false);
  RETURN NEW;
END;
$function$;
