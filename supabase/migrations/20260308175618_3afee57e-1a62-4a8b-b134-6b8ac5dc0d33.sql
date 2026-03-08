
ALTER TABLE public.contents
ADD COLUMN IF NOT EXISTS copy_text text DEFAULT '' ,
ADD COLUMN IF NOT EXISTS publish_time text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS media_urls text[] DEFAULT '{}'::text[];
