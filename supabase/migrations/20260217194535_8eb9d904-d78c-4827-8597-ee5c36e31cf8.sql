
-- Create user-level feature flags table
CREATE TABLE public.user_feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  dashboard boolean NOT NULL DEFAULT true,
  kanban boolean NOT NULL DEFAULT true,
  proposals boolean NOT NULL DEFAULT true,
  followup boolean NOT NULL DEFAULT true,
  chat boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_feature_flags ENABLE ROW LEVEL SECURITY;

-- Users can read their own flags
CREATE POLICY "Users can view own flags"
ON public.user_feature_flags FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can manage all flags
CREATE POLICY "Admins can insert flags"
ON public.user_feature_flags FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update flags"
ON public.user_feature_flags FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete flags"
ON public.user_feature_flags FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_user_feature_flags_updated_at
BEFORE UPDATE ON public.user_feature_flags
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
