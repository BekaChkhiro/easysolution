-- Create tasks table
CREATE TABLE public.tasks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in-progress', 'review', 'done')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task_comments table
CREATE TABLE public.task_comments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- Create policies for tasks
CREATE POLICY "Users can view tasks from their projects" 
ON public.tasks 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.project_members 
        WHERE project_members.project_id = tasks.project_id 
        AND project_members.user_id = auth.uid()
    ) OR is_admin(auth.uid())
);

CREATE POLICY "Users can create tasks in their projects" 
ON public.tasks 
FOR INSERT 
WITH CHECK (
    (EXISTS (
        SELECT 1 FROM public.project_members 
        WHERE project_members.project_id = tasks.project_id 
        AND project_members.user_id = auth.uid()
    ) OR is_admin(auth.uid()))
    AND auth.uid() = created_by
);

CREATE POLICY "Users can update tasks in their projects" 
ON public.tasks 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.project_members 
        WHERE project_members.project_id = tasks.project_id 
        AND project_members.user_id = auth.uid()
    ) OR is_admin(auth.uid())
);

CREATE POLICY "Users can delete tasks in their projects" 
ON public.tasks 
FOR DELETE 
USING (
    (EXISTS (
        SELECT 1 FROM public.project_members 
        WHERE project_members.project_id = tasks.project_id 
        AND project_members.user_id = auth.uid()
    ) OR is_admin(auth.uid()))
    AND (created_by = auth.uid() OR is_admin(auth.uid()))
);

-- Create policies for task comments
CREATE POLICY "Users can view comments on tasks they can access" 
ON public.task_comments 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.tasks 
        JOIN public.project_members ON tasks.project_id = project_members.project_id
        WHERE tasks.id = task_comments.task_id 
        AND project_members.user_id = auth.uid()
    ) OR is_admin(auth.uid())
);

CREATE POLICY "Users can create comments on tasks they can access" 
ON public.task_comments 
FOR INSERT 
WITH CHECK (
    (EXISTS (
        SELECT 1 FROM public.tasks 
        JOIN public.project_members ON tasks.project_id = project_members.project_id
        WHERE tasks.id = task_comments.task_id 
        AND project_members.user_id = auth.uid()
    ) OR is_admin(auth.uid()))
    AND auth.uid() = user_id
);

CREATE POLICY "Users can update their own comments" 
ON public.task_comments 
FOR UPDATE 
USING (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Users can delete their own comments" 
ON public.task_comments 
FOR DELETE 
USING (auth.uid() = user_id OR is_admin(auth.uid()));

-- Create trigger for updating tasks updated_at
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_priority ON public.tasks(priority);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX idx_task_comments_user_id ON public.task_comments(user_id);