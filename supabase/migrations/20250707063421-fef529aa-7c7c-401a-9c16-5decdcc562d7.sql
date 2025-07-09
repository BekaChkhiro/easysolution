-- Extend task_comments table for advanced features (avoiding duplicate indexes)
ALTER TABLE public.task_comments ADD COLUMN IF NOT EXISTS reply_to UUID REFERENCES public.task_comments(id) ON DELETE CASCADE;
ALTER TABLE public.task_comments ADD COLUMN IF NOT EXISTS edited BOOLEAN DEFAULT FALSE;
ALTER TABLE public.task_comments ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE NULL;
ALTER TABLE public.task_comments ADD COLUMN IF NOT EXISTS mentions UUID[] DEFAULT '{}';
ALTER TABLE public.task_comments ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';
ALTER TABLE public.task_comments ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'plain';

-- Add check constraint for content_type if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'task_comments_content_type_check'
  ) THEN
    ALTER TABLE public.task_comments ADD CONSTRAINT task_comments_content_type_check 
    CHECK (content_type IN ('plain', 'markdown'));
  END IF;
END $$;

-- Create indexes that don't exist
CREATE INDEX IF NOT EXISTS idx_task_comments_reply_to ON public.task_comments(reply_to);
CREATE INDEX IF NOT EXISTS idx_task_comments_mentions ON public.task_comments USING GIN(mentions);

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

-- Create trigger for comment notifications (drop if exists first)
DROP TRIGGER IF EXISTS trigger_create_comment_notifications ON public.task_comments;
CREATE TRIGGER trigger_create_comment_notifications
  AFTER INSERT ON public.task_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.create_comment_notifications();

-- Enable realtime for task_comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comments;