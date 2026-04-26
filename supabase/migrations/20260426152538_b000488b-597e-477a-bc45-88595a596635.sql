-- 1. Função centralizada de acesso ao projeto (SECURITY DEFINER, sem recursão)
CREATE OR REPLACE FUNCTION public.has_project_access(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = _project_id AND pm.user_id = _user_id
  )
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = _project_id AND p.owner_id = _user_id
  )
  OR public.has_role(_user_id, 'admin'::app_role)
  OR public.has_role(_user_id, 'moderator'::app_role)
$$;

-- 2. Remove políticas antigas de project_scripts
DROP POLICY IF EXISTS "Users can view scripts for their projects" ON public.project_scripts;
DROP POLICY IF EXISTS "Users can insert scripts" ON public.project_scripts;
DROP POLICY IF EXISTS "Users can update scripts" ON public.project_scripts;
DROP POLICY IF EXISTS "Users can delete scripts" ON public.project_scripts;

-- 3. Recria políticas usando a função (mais legíveis e seguras)
CREATE POLICY "Project members can view scripts"
ON public.project_scripts FOR SELECT
TO authenticated
USING (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Project members can create scripts"
ON public.project_scripts FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND public.has_project_access(auth.uid(), project_id)
);

CREATE POLICY "Project members can update scripts"
ON public.project_scripts FOR UPDATE
TO authenticated
USING (public.has_project_access(auth.uid(), project_id))
WITH CHECK (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Authors owners and admins can delete scripts"
ON public.project_scripts FOR DELETE
TO authenticated
USING (
  auth.uid() = created_by
  OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_scripts.project_id AND p.owner_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);