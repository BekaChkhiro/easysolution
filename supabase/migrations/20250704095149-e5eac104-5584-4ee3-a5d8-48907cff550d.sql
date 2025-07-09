-- Enhance project_members table with better role management
ALTER TABLE project_members ADD COLUMN permissions JSONB DEFAULT '{}';
UPDATE project_members SET role = 'member' WHERE role IS NULL;

-- Create project activity log table
CREATE TABLE project_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  user_id UUID,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  entity_type TEXT,
  entity_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table
CREATE TABLE notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read_status BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- Enable RLS for project_activity
ALTER TABLE project_activity ENABLE ROW LEVEL SECURITY;

-- Enable RLS for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for project_activity
CREATE POLICY "Users can view activity from their projects" 
ON project_activity 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_members.project_id = project_activity.project_id 
    AND project_members.user_id = auth.uid()
  ) OR is_admin(auth.uid())
);

CREATE POLICY "System can create activity logs" 
ON project_activity 
FOR INSERT 
WITH CHECK (true);

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications" 
ON notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" 
ON notifications 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" 
ON notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_project_activity_project_id ON project_activity(project_id);
CREATE INDEX idx_project_activity_created_at ON project_activity(created_at DESC);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read_status ON notifications(read_status);

-- Create function to log project activity
CREATE OR REPLACE FUNCTION log_project_activity(
  p_project_id UUID,
  p_user_id UUID,
  p_activity_type TEXT,
  p_description TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  activity_id UUID;
BEGIN
  INSERT INTO project_activity (
    project_id, user_id, activity_type, description, 
    entity_type, entity_id, metadata
  ) VALUES (
    p_project_id, p_user_id, p_activity_type, p_description,
    p_entity_type, p_entity_id, p_metadata
  ) RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$$;

-- Create function to create notifications
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_project_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id, project_id, type, title, message, metadata
  ) VALUES (
    p_user_id, p_project_id, p_type, p_title, p_message, p_metadata
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;