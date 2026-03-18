
-- Enforce platform restrictions for 'video' (Vídeo Horizontal)
ALTER TABLE public.contents 
ADD CONSTRAINT video_platform_restriction 
CHECK (
  NOT (content_type = 'video' AND (platform @> ARRAY['instagram']::public.platform[] OR platform @> ARRAY['blog']::public.platform[]))
);

-- Enforce platform restrictions for 'artigo' (Artigo)
ALTER TABLE public.contents
ADD CONSTRAINT artigo_platform_restriction
CHECK (
  NOT (content_type = 'artigo' AND (
    platform && ARRAY['instagram', 'facebook', 'tiktok', 'youtube', 'pinterest', 'twitter', 'google_business']::public.platform[]
  ))
);
