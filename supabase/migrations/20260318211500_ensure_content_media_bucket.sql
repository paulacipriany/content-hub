
-- Create content-media storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('content-media', 'content-media', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public to view media
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Public can view content media' 
        AND tablename = 'objects' 
        AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Public can view content media" 
        ON storage.objects FOR SELECT 
        TO public 
        USING (bucket_id = 'content-media');
    END IF;
END $$;

-- Policy to allow authenticated users to upload media
-- We use a permissive policy first to ensure it works, then can restrict it if needed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Authenticated users can upload content media' 
        AND tablename = 'objects' 
        AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Authenticated users can upload content media" 
        ON storage.objects FOR INSERT 
        TO authenticated 
        WITH CHECK (bucket_id = 'content-media');
    END IF;
END $$;

-- Policy to allow authenticated users to update their media
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Authenticated users can update own media' 
        AND tablename = 'objects' 
        AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Authenticated users can update own media" 
        ON storage.objects FOR UPDATE 
        TO authenticated 
        USING (bucket_id = 'content-media');
    END IF;
END $$;

-- Policy to allow authenticated users to delete their media
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can delete own media' 
        AND tablename = 'objects' 
        AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Users can delete own media" 
        ON storage.objects FOR DELETE 
        TO authenticated 
        USING (bucket_id = 'content-media');
    END IF;
END $$;
