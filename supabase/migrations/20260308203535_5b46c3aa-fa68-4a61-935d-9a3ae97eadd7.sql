
CREATE TABLE public.post_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.contents(id) ON DELETE CASCADE,
  views integer DEFAULT 0,
  likes integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  shares integer DEFAULT 0,
  analysis_text text DEFAULT '',
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(content_id)
);

ALTER TABLE public.post_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view post analyses"
  ON public.post_analyses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Team members can insert post analyses"
  ON public.post_analyses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Team members can update post analyses"
  ON public.post_analyses FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete post analyses"
  ON public.post_analyses FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
