-- Add status field to project_tasks table
ALTER TABLE public.project_tasks 
ADD COLUMN status text DEFAULT 'backlog';

-- Add check constraint to ensure valid status values
ALTER TABLE public.project_tasks 
ADD CONSTRAINT project_tasks_status_check 
CHECK (status IN ('backlog', 'planning', 'in_progress', 'paused', 'done', 'cancelled'));