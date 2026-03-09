-- Add priority field to project_tasks table
ALTER TABLE public.project_tasks 
ADD COLUMN priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));