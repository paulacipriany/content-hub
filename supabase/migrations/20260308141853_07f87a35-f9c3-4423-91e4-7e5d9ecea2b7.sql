
-- Projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view projects" ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners and admins can update projects" ON public.projects FOR UPDATE TO authenticated USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners and admins can delete projects" ON public.projects FOR DELETE TO authenticated USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Platform and content type enums
CREATE TYPE public.platform AS ENUM ('instagram', 'facebook', 'linkedin', 'tiktok', 'youtube');
CREATE TYPE public.content_type AS ENUM ('feed', 'reels', 'stories', 'carousel', 'video');
CREATE TYPE public.workflow_status AS ENUM ('idea', 'production', 'review', 'approval-internal', 'approval-client', 'scheduled', 'published');

-- Contents table
CREATE TABLE public.contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  platform public.platform NOT NULL DEFAULT 'instagram',
  content_type public.content_type NOT NULL DEFAULT 'feed',
  status public.workflow_status NOT NULL DEFAULT 'idea',
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  publish_date DATE,
  hashtags TEXT[] DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view contents" ON public.contents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create contents" ON public.contents FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Assignees, creators and admins can update" ON public.contents FOR UPDATE TO authenticated USING (auth.uid() = created_by OR auth.uid() = assignee_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Creators and admins can delete" ON public.contents FOR DELETE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_contents_updated_at BEFORE UPDATE ON public.contents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Checklist items
CREATE TABLE public.checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES public.contents(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view checklist items" ON public.checklist_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage checklist items" ON public.checklist_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update checklist items" ON public.checklist_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete checklist items" ON public.checklist_items FOR DELETE TO authenticated USING (true);

-- Comments
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES public.contents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view comments" ON public.comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create comments" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON public.comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Approvals
CREATE TABLE public.approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES public.contents(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'changes_requested', 'rejected')),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view approvals" ON public.approvals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create approvals" ON public.approvals FOR INSERT TO authenticated WITH CHECK (auth.uid() = reviewer_id);

-- Status history for audit trail
CREATE TABLE public.status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES public.contents(id) ON DELETE CASCADE,
  from_status public.workflow_status,
  to_status public.workflow_status NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view status history" ON public.status_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert status history" ON public.status_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = changed_by);
