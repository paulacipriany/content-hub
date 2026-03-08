CREATE TABLE public.media_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  filename TEXT NOT NULL DEFAULT '',
  content_id UUID REFERENCES public.contents(id) ON DELETE SET NULL,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view media library"
  ON public.media_library FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can insert media"
  ON public.media_library FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Uploaders and admins can update media"
  ON public.media_library FOR UPDATE TO authenticated
  USING (auth.uid() = uploaded_by OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins and moderators can delete media"
  ON public.media_library FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));