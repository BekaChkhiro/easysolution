-- Ensure project-files bucket exists (if not already created)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('project-files', 'project-files', false)
ON CONFLICT (id) DO NOTHING;

-- Create comprehensive storage policies for project files
CREATE POLICY "Users can view files from their projects" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'project-files' 
  AND (
    EXISTS (
      SELECT 1 FROM project_files pf
      JOIN project_members pm ON pf.project_id = pm.project_id
      WHERE pf.file_path = name 
      AND pm.user_id = auth.uid()
    )
    OR is_admin(auth.uid())
  )
);

CREATE POLICY "Users can upload files to their projects" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'project-files'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update files in their projects" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'project-files' 
  AND (
    EXISTS (
      SELECT 1 FROM project_files pf
      JOIN project_members pm ON pf.project_id = pm.project_id
      WHERE pf.file_path = name 
      AND pm.user_id = auth.uid()
    )
    OR is_admin(auth.uid())
  )
);

CREATE POLICY "Users can delete files from their projects" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'project-files' 
  AND (
    EXISTS (
      SELECT 1 FROM project_files pf
      JOIN project_members pm ON pf.project_id = pm.project_id
      WHERE pf.file_path = name 
      AND pm.user_id = auth.uid()
    )
    OR is_admin(auth.uid())
  )
);