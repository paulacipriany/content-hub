CREATE POLICY "Admins and moderators can view all project tasks"
ON public.project_tasks FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));