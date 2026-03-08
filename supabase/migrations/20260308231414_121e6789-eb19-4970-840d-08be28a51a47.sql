
CREATE TABLE public.commemorative_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  date date NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.commemorative_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view commemorative dates"
  ON public.commemorative_dates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Team members can insert commemorative dates"
  ON public.commemorative_dates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators and admins can update commemorative dates"
  ON public.commemorative_dates FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Creators and admins can delete commemorative dates"
  ON public.commemorative_dates FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));
