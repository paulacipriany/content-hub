
DROP POLICY "Authenticated users can update project tasks" ON public.project_tasks;

CREATE POLICY "Project members can update project tasks"
ON public.project_tasks FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_tasks.project_id
    AND (p.owner_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
  OR auth.uid() = created_by
);
