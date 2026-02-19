
-- Add IT-professional fields to deals table
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS client_type text DEFAULT NULL;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS cpf_cnpj text DEFAULT NULL;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS position text DEFAULT NULL;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS website text DEFAULT NULL;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS priority text DEFAULT NULL;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS segment text DEFAULT NULL;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS main_need text DEFAULT NULL;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS services_interest text DEFAULT NULL;
