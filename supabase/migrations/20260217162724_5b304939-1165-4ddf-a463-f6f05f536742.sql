INSERT INTO public.user_roles (user_id, role)
VALUES ('8952c045-b877-4203-9902-bb035e13b356', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

DELETE FROM public.user_roles 
WHERE user_id = '8952c045-b877-4203-9902-bb035e13b356' AND role = 'user';