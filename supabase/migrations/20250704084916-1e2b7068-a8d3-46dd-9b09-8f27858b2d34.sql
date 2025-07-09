-- Fix infinite recursion completely
DROP POLICY IF EXISTS "Users can view members of projects they belong to" ON public.project_members;

-- Create a much simpler policy without any self-reference
CREATE POLICY "Users can view project members" 
ON public.project_members 
FOR SELECT 
USING (
  user_id = auth.uid() OR 
  public.is_admin(auth.uid())
);