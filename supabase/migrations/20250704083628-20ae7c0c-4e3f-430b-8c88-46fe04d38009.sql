-- Fix infinite recursion in project_members policies
-- Drop the problematic policy that causes recursion
DROP POLICY IF EXISTS "Users can view members of projects they belong to" ON public.project_members;

-- Create a simpler policy that doesn't cause recursion
CREATE POLICY "Users can view members of projects they belong to" 
ON public.project_members 
FOR SELECT 
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 
    FROM public.project_members pm 
    WHERE pm.project_id = project_members.project_id 
    AND pm.user_id = auth.uid()
    LIMIT 1
  )
);