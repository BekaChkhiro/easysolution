-- Extend task_comments table for advanced features
ALTER TABLE public.task_comments ADD COLUMN reply_to UUID REFERENCES public.task_comments(id) ON DELETE CASCADE;
ALTER TABLE public.task_comments ADD COLUMN edited BOOLEAN DEFAULT FALSE;
ALTER TABLE public.task_comments ADD COLUMN edited_at TIMESTAMP WITH TIME ZONE NULL;
ALTER TABLE public.task_comments ADD COLUMN mentions UUID[] DEFAULT '{}';
ALTER TABLE public.task_comments ADD COLUMN attachments JSONB DEFAULT '[]';
ALTER TABLE public.task_comments ADD COLUMN content_type TEXT DEFAULT 'plain' CHECK (content_type IN ('plain', 'markdown'));

-- Create index for comment threading
CREATE INDEX idx_task_comments_reply_to ON public.task_comments(reply_to);
CREATE INDEX idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX idx_task_comments_mentions ON public.task_comments USING GIN(mentions);

-- Function to get comment thread depth
CREATE OR REPLACE FUNCTION public.get_comment_depth(comment_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  depth INTEGER := 0;
  current_id UUID := comment_id;
  parent_id UUID;
BEGIN
  LOOP
    SELECT reply_to INTO parent_id
    FROM public.task_comments
    WHERE id = current_id;
    
    IF parent_id IS NULL THEN
      EXIT;
    END IF;
    
    depth := depth + 1;
    current_id := parent_id;
    
    -- Prevent infinite recursion
    IF depth > 10 THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN depth;
END;
$$;

-- Function to create comment notifications
CREATE OR REPLACE FUNCTION public.create_comment_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  task_record RECORD;
  mention_id UUID;
  assignee_id UUID;
  creator_id UUID;
BEGIN
  -- Get task details
  SELECT t.*, t.assignee_id as task_assignee, t.created_by as task_creator
  INTO task_record
  FROM public.tasks t
  WHERE t.id = NEW.task_id;
  
  -- Create notifications for mentions
  IF array_length(NEW.mentions, 1) > 0 THEN
    FOREACH mention_id IN ARRAY NEW.mentions LOOP
      IF mention_id != NEW.user_id THEN
        PERFORM public.create_notification(
          mention_id,
          task_record.project_id,
          'comment_mention',
          'You were mentioned in a comment',
          'You were mentioned in a comment on task "' || task_record.title || '"',
          jsonb_build_object(
            'task_id', NEW.task_id,
            'comment_id', NEW.id,
            'mentioned_by', NEW.user_id
          )
        );
      END IF;
    END LOOP;
  END IF;
  
  -- Notify task assignee (if not the commenter)
  IF task_record.task_assignee IS NOT NULL AND task_record.task_assignee != NEW.user_id THEN
    PERFORM public.create_notification(
      task_record.task_assignee,
      task_record.project_id,
      'task_comment',
      'New comment on your task',
      'New comment added to task "' || task_record.title || '"',
      jsonb_build_object(
        'task_id', NEW.task_id,
        'comment_id', NEW.id,
        'commenter', NEW.user_id
      )
    );
  END IF;
  
  -- If this is a reply, notify the original commenter
  IF NEW.reply_to IS NOT NULL THEN
    SELECT user_id INTO creator_id
    FROM public.task_comments
    WHERE id = NEW.reply_to;
    
    IF creator_id IS NOT NULL AND creator_id != NEW.user_id THEN
      PERFORM public.create_notification(
        creator_id,
        task_record.project_id,
        'comment_reply',
        'Reply to your comment',
        'Someone replied to your comment on task "' || task_record.title || '"',
        jsonb_build_object(
          'task_id', NEW.task_id,
          'comment_id', NEW.id,
          'reply_to', NEW.reply_to,
          'replier', NEW.user_id
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for comment notifications
CREATE TRIGGER trigger_create_comment_notifications
  AFTER INSERT ON public.task_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.create_comment_notifications();

-- Function to log comment activity
CREATE OR REPLACE FUNCTION public.log_comment_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  task_record RECORD;
  activity_description TEXT;
BEGIN
  -- Get task details
  SELECT t.project_id, t.title
  INTO task_record
  FROM public.tasks t
  WHERE t.id = COALESCE(NEW.task_id, OLD.task_id);
  
  -- Handle different operations
  IF TG_OP = 'INSERT' THEN
    IF NEW.reply_to IS NOT NULL THEN
      activity_description := 'Replied to a comment on task "' || task_record.title || '"';
    ELSE
      activity_description := 'Added a comment to task "' || task_record.title || '"';
    END IF;
    
    PERFORM public.log_project_activity(
      task_record.project_id,
      NEW.user_id,
      'comment_created',
      activity_description,
      'comment',
      NEW.id
    );
    
  ELSIF TG_OP = 'UPDATE' THEN
    activity_description := 'Edited a comment on task "' || task_record.title || '"';
    
    PERFORM public.log_project_activity(
      task_record.project_id,
      NEW.user_id,
      'comment_updated',
      activity_description,
      'comment',
      NEW.id
    );
    
  ELSIF TG_OP = 'DELETE' THEN
    activity_description := 'Deleted a comment on task "' || task_record.title || '"';
    
    PERFORM public.log_project_activity(
      task_record.project_id,
      OLD.user_id,
      'comment_deleted',
      activity_description,
      'comment',
      OLD.id
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for comment activity logging
CREATE TRIGGER trigger_log_comment_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.task_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.log_comment_activity();

-- Enable realtime for task_comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comments;