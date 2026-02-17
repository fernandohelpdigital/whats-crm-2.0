-- Drop the partial unique index (doesn't work with PostgREST upsert)
DROP INDEX IF EXISTS deals_phone_user_id_unique;

-- Create a proper unique constraint on phone+user_id
ALTER TABLE public.deals ADD CONSTRAINT deals_phone_user_id_unique UNIQUE (phone, user_id);