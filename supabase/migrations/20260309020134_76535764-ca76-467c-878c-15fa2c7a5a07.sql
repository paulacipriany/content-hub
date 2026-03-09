
CREATE TABLE public.project_platform_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  platform text NOT NULL,
  profile_url text DEFAULT '',
  username text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, platform)
);

ALTER TABLE public.project_platform_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view platform profiles"
  ON public.project_platform_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Project owners and admins can insert platform profiles"
  ON public.project_platform_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_platform_profiles.project_id AND p.owner_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Project owners and admins can update platform profiles"
  ON public.project_platform_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_platform_profiles.project_id AND p.owner_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Project owners and admins can delete platform profiles"
  ON public.project_platform_profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_platform_profiles.project_id AND p.owner_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );
