CREATE TABLE public.project_scripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Documento sem título',
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view scripts for their projects"
ON public.project_scripts FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.project_members pm WHERE pm.project_id = project_scripts.project_id AND pm.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_scripts.project_id AND p.owner_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

CREATE POLICY "Users can insert scripts"
ON public.project_scripts FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by AND (
    EXISTS (SELECT 1 FROM public.project_members pm WHERE pm.project_id = project_scripts.project_id AND pm.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_scripts.project_id AND p.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  )
);

CREATE POLICY "Users can update scripts"
ON public.project_scripts FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.project_members pm WHERE pm.project_id = project_scripts.project_id AND pm.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_scripts.project_id AND p.owner_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

CREATE POLICY "Users can delete scripts"
ON public.project_scripts FOR DELETE
TO authenticated
USING (
  auth.uid() = created_by
  OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_scripts.project_id AND p.owner_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

CREATE TRIGGER update_project_scripts_updated_at
BEFORE UPDATE ON public.project_scripts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_project_scripts_project_id ON public.project_scripts(project_id);