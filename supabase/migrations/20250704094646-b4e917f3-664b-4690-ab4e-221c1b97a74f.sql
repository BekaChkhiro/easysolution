-- Create calendar events table
CREATE TABLE calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_type TEXT DEFAULT 'milestone',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project files table
CREATE TABLE project_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for calendar_events
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Enable RLS for project_files
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

-- Create policies for calendar_events
CREATE POLICY "Users can view events from their projects" 
ON calendar_events 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_members.project_id = calendar_events.project_id 
    AND project_members.user_id = auth.uid()
  ) OR is_admin(auth.uid())
);

CREATE POLICY "Users can create events in their projects" 
ON calendar_events 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_members.project_id = calendar_events.project_id 
    AND project_members.user_id = auth.uid()
  ) OR is_admin(auth.uid())
);

CREATE POLICY "Users can update events in their projects" 
ON calendar_events 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_members.project_id = calendar_events.project_id 
    AND project_members.user_id = auth.uid()
  ) OR is_admin(auth.uid())
);

CREATE POLICY "Users can delete events in their projects" 
ON calendar_events 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_members.project_id = calendar_events.project_id 
    AND project_members.user_id = auth.uid()
  ) OR is_admin(auth.uid())
);

-- Create policies for project_files
CREATE POLICY "Users can view files from their projects" 
ON project_files 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_members.project_id = project_files.project_id 
    AND project_members.user_id = auth.uid()
  ) OR is_admin(auth.uid())
);

CREATE POLICY "Users can upload files to their projects" 
ON project_files 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_members.project_id = project_files.project_id 
    AND project_members.user_id = auth.uid()
  ) OR is_admin(auth.uid())
);

CREATE POLICY "Users can delete files from their projects" 
ON project_files 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_members.project_id = project_files.project_id 
    AND project_members.user_id = auth.uid()
  ) OR is_admin(auth.uid())
);

-- Add triggers for updated_at
CREATE TRIGGER update_calendar_events_updated_at
BEFORE UPDATE ON calendar_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for project files
INSERT INTO storage.buckets (id, name, public) VALUES ('project-files', 'project-files', false);

-- Create storage policies for project files
CREATE POLICY "Users can view files from their projects"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-files' AND 
  EXISTS (
    SELECT 1 FROM project_files pf
    JOIN project_members pm ON pf.project_id = pm.project_id
    WHERE pf.file_path = name AND pm.user_id = auth.uid()
  ) OR is_admin(auth.uid())
);

CREATE POLICY "Users can upload files to their projects"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-files' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete files from their projects"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'project-files' AND
  EXISTS (
    SELECT 1 FROM project_files pf
    JOIN project_members pm ON pf.project_id = pm.project_id
    WHERE pf.file_path = name AND pm.user_id = auth.uid()
  ) OR is_admin(auth.uid())
);