-- Add description and file_urls to task_lists
ALTER TABLE public.task_lists ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.task_lists ADD COLUMN IF NOT EXISTS file_urls text[] DEFAULT '{}';
