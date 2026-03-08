
-- Add assigned_to column to project_tasks
ALTER TABLE public.project_tasks ADD COLUMN assigned_to uuid DEFAULT NULL;

-- Drop old SELECT policy
DROP POLICY IF EXISTS "Users can view own project tasks" ON public.project_tasks;

-- New SELECT policy: see tasks you created OR are assigned to
CREATE POLICY "Users can view own or assigned project tasks"
  ON public.project_tasks
  FOR SELECT
  USING (auth.uid() = created_by OR auth.uid() = assigned_to);

-- Update the UPDATE policy to also allow assignees to update
DROP POLICY IF EXISTS "Project members can update project tasks" ON public.project_tasks;

CREATE POLICY "Creators assignees and admins can update project tasks"
  ON public.project_tasks
  FOR UPDATE
  USING (
    auth.uid() = created_by 
    OR auth.uid() = assigned_to 
    OR has_role(auth.uid(), 'admin'::app_role)
  );
