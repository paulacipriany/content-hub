
CREATE TABLE public.project_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  text text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view project tasks"
ON public.project_tasks FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert project tasks"
ON public.project_tasks FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update project tasks"
ON public.project_tasks FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "Creators and admins can delete project tasks"
ON public.project_tasks FOR DELETE TO authenticated
USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'));
