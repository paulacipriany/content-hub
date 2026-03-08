
-- Add missing policies (the insert one already exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view content media' AND tablename = 'objects') THEN
    CREATE POLICY "Public can view content media" ON storage.objects FOR SELECT TO public USING (bucket_id = 'content-media');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own media' AND tablename = 'objects') THEN
    CREATE POLICY "Users can delete own media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'content-media' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;
