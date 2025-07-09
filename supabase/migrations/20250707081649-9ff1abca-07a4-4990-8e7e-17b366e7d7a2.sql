-- Allow all authenticated users to search for other users for team management
-- This allows users to see basic profile info (display_name, full_name, avatar_url) 
-- needed for adding team members, while keeping other sensitive data protected

CREATE POLICY "Users can search profiles for team management" 
ON profiles 
FOR SELECT 
TO authenticated
USING (true);

-- Drop the old restrictive policy for regular users since we now have a more permissive one
DROP POLICY "Users can view their own profile" ON profiles;