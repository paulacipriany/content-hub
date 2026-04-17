-- Create project_notes table
CREATE TABLE public.project_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  title TEXT DEFAULT '',
  content TEXT DEFAULT '',
  color TEXT NOT NULL DEFAULT '#ffffff',
  type TEXT NOT NULL DEFAULT 'note',
  image_url TEXT,
  pinned BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view project notes"
ON public.project_notes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create project notes"
ON public.project_notes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update project notes"
ON public.project_notes FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete project notes"
ON public.project_notes FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_project_notes_updated_at
BEFORE UPDATE ON public.project_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create project_note_items (checklist items inside a note)
CREATE TABLE public.project_note_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES public.project_notes(id) ON DELETE CASCADE,
  text TEXT NOT NULL DEFAULT '',
  done BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_note_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view note items"
ON public.project_note_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create note items"
ON public.project_note_items FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update note items"
ON public.project_note_items FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete note items"
ON public.project_note_items FOR DELETE TO authenticated USING (true);

-- Storage bucket for note images
INSERT INTO storage.buckets (id, name, public) VALUES ('note-images', 'note-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Note images are publicly accessible"
ON storage.objects FOR SELECT USING (bucket_id = 'note-images');

CREATE POLICY "Authenticated users can upload note images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'note-images');

CREATE POLICY "Authenticated users can update note images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'note-images');

CREATE POLICY "Authenticated users can delete note images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'note-images');