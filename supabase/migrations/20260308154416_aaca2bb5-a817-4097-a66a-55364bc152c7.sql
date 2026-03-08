
ALTER TABLE public.contents ALTER COLUMN platform DROP DEFAULT;
ALTER TABLE public.contents ALTER COLUMN platform TYPE platform[] USING ARRAY[platform]::platform[];
ALTER TABLE public.contents ALTER COLUMN platform SET DEFAULT ARRAY['instagram']::platform[];
