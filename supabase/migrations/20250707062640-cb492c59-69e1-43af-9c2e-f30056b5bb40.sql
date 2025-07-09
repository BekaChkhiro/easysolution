-- Add subtasks support to tasks table
ALTER TABLE public.tasks ADD COLUMN parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE;
ALTER TABLE public.tasks ADD COLUMN is_subtask BOOLEAN DEFAULT FALSE;
ALTER TABLE public.tasks ADD COLUMN subtask_order INTEGER DEFAULT 0;

-- Create index for better performance on parent task queries
CREATE INDEX idx_tasks_parent_task_id ON public.tasks(parent_task_id);

-- Function to calculate parent task progress based on subtasks
CREATE OR REPLACE FUNCTION public.calculate_task_progress(task_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  total_subtasks INTEGER;
  completed_subtasks INTEGER;
  progress_percentage INTEGER;
BEGIN
  -- Count total subtasks
  SELECT COUNT(*) INTO total_subtasks
  FROM public.tasks
  WHERE parent_task_id = task_id;
  
  -- If no subtasks, return 0
  IF total_subtasks = 0 THEN
    RETURN 0;
  END IF;
  
  -- Count completed subtasks
  SELECT COUNT(*) INTO completed_subtasks
  FROM public.tasks
  WHERE parent_task_id = task_id AND status = 'done';
  
  -- Calculate percentage
  progress_percentage := ROUND((completed_subtasks::FLOAT / total_subtasks::FLOAT) * 100);
  
  RETURN progress_percentage;
END;
$$;

-- Function to update parent task status when subtasks change
CREATE OR REPLACE FUNCTION public.update_parent_task_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  parent_id UUID;
  subtask_progress INTEGER;
BEGIN
  -- Get parent task ID from NEW or OLD record
  parent_id := COALESCE(NEW.parent_task_id, OLD.parent_task_id);
  
  -- If there's a parent task, update its progress
  IF parent_id IS NOT NULL THEN
    subtask_progress := public.calculate_task_progress(parent_id);
    
    -- Optionally auto-complete parent task when all subtasks are done
    IF subtask_progress = 100 THEN
      UPDATE public.tasks 
      SET status = 'done', updated_at = now()
      WHERE id = parent_id AND status != 'done';
    ELSIF subtask_progress > 0 AND subtask_progress < 100 THEN
      -- Set parent to in-progress if some subtasks are done
      UPDATE public.tasks 
      SET status = 'in-progress', updated_at = now()
      WHERE id = parent_id AND status = 'todo';
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger to update parent task progress when subtasks change
CREATE TRIGGER trigger_update_parent_task_progress
  AFTER INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_parent_task_progress();

-- Update existing tasks to set proper subtask flags
UPDATE public.tasks SET is_subtask = FALSE WHERE is_subtask IS NULL;