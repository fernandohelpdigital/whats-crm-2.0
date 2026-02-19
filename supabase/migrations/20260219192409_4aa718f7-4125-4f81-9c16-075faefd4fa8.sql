
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  INSERT INTO public.user_feature_flags (user_id, dashboard, chat, kanban, proposals, followup)
    VALUES (NEW.id, true, true, true, false, false);
  RETURN NEW;
END;
$function$;
