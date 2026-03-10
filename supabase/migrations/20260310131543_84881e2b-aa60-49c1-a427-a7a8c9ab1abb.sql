
CREATE TABLE public.content_approvers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.contents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (content_id, user_id)
);

ALTER TABLE public.content_approvers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view content approvers"
ON public.content_approvers FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Content creators and admins can insert approvers"
ON public.content_approvers FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.contents c
    WHERE c.id = content_approvers.content_id
    AND (c.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Content creators and admins can delete approvers"
ON public.content_approvers FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contents c
    WHERE c.id = content_approvers.content_id
    AND (c.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);
