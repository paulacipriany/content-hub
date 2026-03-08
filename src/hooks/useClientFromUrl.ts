import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';

/**
 * Hook that syncs the selected project from URL params.
 * Call this in every client-scoped page.
 */
export const useClientFromUrl = () => {
  const { id } = useParams<{ id: string }>();
  const { projects, selectedProject, setSelectedProject } = useApp();

  useEffect(() => {
    if (!id) return;
    if (selectedProject?.id === id) return;
    const project = projects.find(p => p.id === id);
    if (project) setSelectedProject(project);
  }, [id, projects, selectedProject, setSelectedProject]);
};
