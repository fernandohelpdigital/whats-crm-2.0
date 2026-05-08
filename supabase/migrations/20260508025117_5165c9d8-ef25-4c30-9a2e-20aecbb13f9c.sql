ALTER TABLE public.user_feature_flags REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_feature_flags;