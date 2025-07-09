-- Fix search_path security issues for all functions

-- Update update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$function$;

-- Update is_admin function
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE profiles.user_id = $1 AND role = 'admin'
  );
$function$;

-- Update log_project_activity function
CREATE OR REPLACE FUNCTION public.log_project_activity(
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
SET search_path = ''
AS $$
DECLARE
  activity_id UUID;
BEGIN
  INSERT INTO public.project_activity (
    project_id, user_id, activity_type, description, 
    entity_type, entity_id, metadata
  ) VALUES (
    p_project_id, p_user_id, p_activity_type, p_description,
    p_entity_type, p_entity_id, p_metadata
  ) RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$$;

-- Update create_notification function
CREATE OR REPLACE FUNCTION public.create_notification(
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
SET search_path = ''
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id, project_id, type, title, message, metadata
  ) VALUES (
    p_user_id, p_project_id, p_type, p_title, p_message, p_metadata
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;