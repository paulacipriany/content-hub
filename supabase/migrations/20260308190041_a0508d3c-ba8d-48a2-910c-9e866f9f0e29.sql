
-- Drop the old permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view project tasks" ON public.project_tasks;

-- Create new SELECT policy: users can only see their own tasks
CREATE POLICY "Users can view own project tasks"
  ON public.project_tasks
  FOR SELECT
  USING (auth.uid() = created_by);
