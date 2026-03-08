
-- Fix checklist_items policies to be more restrictive
-- Drop overly permissive policies
DROP POLICY "Authenticated users can manage checklist items" ON public.checklist_items;
DROP POLICY "Authenticated users can update checklist items" ON public.checklist_items;
DROP POLICY "Authenticated users can delete checklist items" ON public.checklist_items;

-- Create proper policies tied to content ownership
CREATE POLICY "Content members can insert checklist items" ON public.checklist_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contents c
      WHERE c.id = content_id
      AND (c.created_by = auth.uid() OR c.assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Content members can update checklist items" ON public.checklist_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contents c
      WHERE c.id = content_id
      AND (c.created_by = auth.uid() OR c.assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Content members can delete checklist items" ON public.checklist_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contents c
      WHERE c.id = content_id
      AND (c.created_by = auth.uid() OR c.assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );
