-- Make existing user an admin for testing
UPDATE public.profiles 
SET role = 'admin' 
WHERE user_id = '0378c4db-4355-48d2-86b1-2fbcac7cedfc';