
-- Add unique constraint on phone + user_id to prevent duplicates
ALTER TABLE public.contacts ADD CONSTRAINT contacts_phone_user_id_unique UNIQUE (phone, user_id);
