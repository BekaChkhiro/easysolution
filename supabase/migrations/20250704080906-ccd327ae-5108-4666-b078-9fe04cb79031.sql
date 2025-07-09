-- Add role column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Update existing profiles to have 'user' role
UPDATE public.profiles 
SET role = 'user' 
WHERE role IS NULL;

-- Make role column not null
ALTER TABLE public.profiles 
ALTER COLUMN role SET NOT NULL;

-- Create index on role for better performance
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- Update the handle_new_user function to set default role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, full_name, role)
  VALUES (
    new.id, 
    new.raw_user_meta_data ->> 'display_name', 
    new.raw_user_meta_data ->> 'full_name',
    COALESCE(new.raw_user_meta_data ->> 'role', 'user')
  );
  RETURN new;
END;
$$;

-- Create a function to check if user is admin (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE profiles.user_id = $1 AND role = 'admin'
  );
$$;

-- Create admin policy for profiles table
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.is_admin(auth.uid()) OR auth.uid() = user_id);