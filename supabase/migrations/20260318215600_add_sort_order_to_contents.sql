-- Add sort_order to contents table
ALTER TABLE public.contents ADD COLUMN IF NOT EXISTS sort_order float8 DEFAULT 0;

-- Update existing rows to have a sensible default based on created_at
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY status ORDER BY created_at DESC) as row_num
  FROM public.contents
)
UPDATE public.contents
SET sort_order = numbered.row_num
FROM numbered
WHERE public.contents.id = numbered.id;
