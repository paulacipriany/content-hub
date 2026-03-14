
-- Create task_lists table
CREATE TABLE public.task_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add list_id to project_tasks
ALTER TABLE public.project_tasks ADD COLUMN list_id UUID REFERENCES public.task_lists(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.task_lists ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_lists (same pattern as project_tasks)
CREATE POLICY "Users can view task lists for their projects"
  ON public.task_lists FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm WHERE pm.project_id = task_lists.project_id AND pm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.projects p WHERE p.id = task_lists.project_id AND p.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
  );

CREATE POLICY "Users can insert task lists"
  ON public.task_lists FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members pm WHERE pm.project_id = task_lists.project_id AND pm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.projects p WHERE p.id = task_lists.project_id AND p.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
  );

CREATE POLICY "Users can update task lists"
  ON public.task_lists FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm WHERE pm.project_id = task_lists.project_id AND pm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.projects p WHERE p.id = task_lists.project_id AND p.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
  );

CREATE POLICY "Users can delete task lists"
  ON public.task_lists FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm WHERE pm.project_id = task_lists.project_id AND pm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.projects p WHERE p.id = task_lists.project_id AND p.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
  );
