-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed', 'archived')),
  start_date DATE,
  end_date DATE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_project_name UNIQUE (name)
);

-- Create project_members table for user-project relationships
CREATE TABLE public.project_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'manager', 'viewer')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_project_member UNIQUE (project_id, user_id)
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX idx_projects_created_by ON public.projects(created_by);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX idx_project_members_user_id ON public.project_members(user_id);

-- RLS Policies for projects
CREATE POLICY "Admins can view all projects" 
ON public.projects 
FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view projects they are members of" 
ON public.projects 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.project_members 
    WHERE project_id = projects.id AND user_id = auth.uid()
  )
);

CREATE POLICY "Admins can create projects" 
ON public.projects 
FOR INSERT 
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update projects" 
ON public.projects 
FOR UPDATE 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete projects" 
ON public.projects 
FOR DELETE 
USING (public.is_admin(auth.uid()));

-- RLS Policies for project_members
CREATE POLICY "Admins can view all project members" 
ON public.project_members 
FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view members of projects they belong to" 
ON public.project_members 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.project_members pm 
    WHERE pm.project_id = project_members.project_id AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can add project members" 
ON public.project_members 
FOR INSERT 
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update project members" 
ON public.project_members 
FOR UPDATE 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can remove project members" 
ON public.project_members 
FOR DELETE 
USING (public.is_admin(auth.uid()));

-- Create function to update updated_at timestamp
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();