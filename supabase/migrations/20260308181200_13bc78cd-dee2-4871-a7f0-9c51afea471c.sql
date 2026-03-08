
-- Table to link users to projects (clients)
CREATE TABLE public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view members
CREATE POLICY "Authenticated users can view project members"
  ON public.project_members FOR SELECT TO authenticated
  USING (true);

-- Project owners and admins can manage members
CREATE POLICY "Owners and admins can insert project members"
  ON public.project_members FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_members.project_id AND p.owner_id = auth.uid())
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Owners and admins can delete project members"
  ON public.project_members FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_members.project_id AND p.owner_id = auth.uid())
    OR has_role(auth.uid(), 'admin')
  );
