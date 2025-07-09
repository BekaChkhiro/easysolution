-- Add kanban position tracking to tasks
ALTER TABLE tasks ADD COLUMN kanban_position INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN kanban_column VARCHAR(50) DEFAULT 'todo';

-- Create custom kanban columns table
CREATE TABLE kanban_columns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  color VARCHAR(20) DEFAULT '#6b7280',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for kanban_columns
ALTER TABLE kanban_columns ENABLE ROW LEVEL SECURITY;

-- Create policies for kanban_columns
CREATE POLICY "Users can view columns from their projects" 
ON kanban_columns 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_members.project_id = kanban_columns.project_id 
    AND project_members.user_id = auth.uid()
  ) OR is_admin(auth.uid())
);

CREATE POLICY "Users can create columns in their projects" 
ON kanban_columns 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_members.project_id = kanban_columns.project_id 
    AND project_members.user_id = auth.uid()
  ) OR is_admin(auth.uid())
);

CREATE POLICY "Users can update columns in their projects" 
ON kanban_columns 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_members.project_id = kanban_columns.project_id 
    AND project_members.user_id = auth.uid()
  ) OR is_admin(auth.uid())
);

CREATE POLICY "Users can delete columns in their projects" 
ON kanban_columns 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_members.project_id = kanban_columns.project_id 
    AND project_members.user_id = auth.uid()
  ) OR is_admin(auth.uid())
);

-- Add trigger for updated_at
CREATE TRIGGER update_kanban_columns_updated_at
BEFORE UPDATE ON kanban_columns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default columns for existing projects
INSERT INTO kanban_columns (project_id, name, position, color)
SELECT 
  id, 
  'To Do', 
  0, 
  '#6b7280'
FROM projects;

INSERT INTO kanban_columns (project_id, name, position, color)
SELECT 
  id, 
  'In Progress', 
  1, 
  '#3b82f6'
FROM projects;

INSERT INTO kanban_columns (project_id, name, position, color)
SELECT 
  id, 
  'Review', 
  2, 
  '#f59e0b'
FROM projects;

INSERT INTO kanban_columns (project_id, name, position, color)
SELECT 
  id, 
  'Done', 
  3, 
  '#10b981'
FROM projects;