CREATE POLICY "Project members can update content status"
ON public.contents
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = contents.project_id
    AND pm.user_id = auth.uid()
  )
);