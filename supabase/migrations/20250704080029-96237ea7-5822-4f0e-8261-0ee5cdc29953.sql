-- Create profile for existing user
INSERT INTO public.profiles (user_id, display_name, full_name)
VALUES ('0378c4db-4355-48d2-86b1-2fbcac7cedfc', 'User', 'User')
ON CONFLICT (user_id) DO NOTHING;