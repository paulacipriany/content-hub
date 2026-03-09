import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ContentWithRelations, DbProject, WorkflowStatus } from '@/data/types';
import { applyClientPalette } from '@/lib/clientPalette';

interface AppContextType {
  contents: ContentWithRelations[];
  projects: DbProject[];
  selectedProject: DbProject | null;
  setSelectedProject: (project: DbProject | null) => void;
  projectContents: ContentWithRelations[];
  selectedContent: ContentWithRelations | null;
  setSelectedContent: (content: ContentWithRelations | null) => void;
  updateContentStatus: (id: string, status: WorkflowStatus) => Promise<void>;
  updateContentDate: (id: string, date: string | null) => Promise<void>;
  updateContentFields: (id: string, fields: Record<string, any>) => Promise<void>;
  deleteContent: (id: string) => Promise<void>;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  loading: boolean;
  refetch: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role } = useAuth();
  const location = useLocation();
  const [contents, setContents] = useState<ContentWithRelations[]>([]);
  const [projects, setProjects] = useState<DbProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<DbProject | null>(null);
  const [selectedContent, setSelectedContent] = useState<ContentWithRelations | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);

  const projectContents = selectedProject
    ? contents.filter(c => c.project_id === selectedProject.id)
    : contents;

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [projectsRes, contentsRes] = await Promise.all([
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('contents').select('*').order('created_at', { ascending: false }),
    ]);

    let projectsList = (projectsRes.data ?? []) as DbProject[];
    let contentsList = (contentsRes.data ?? []) as ContentWithRelations[];

    // For client-role users, only show projects they are members of
    if (role === 'client') {
      const { data: memberships } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id);
      const allowedIds = new Set((memberships ?? []).map(m => m.project_id));
      projectsList = projectsList.filter(p => allowedIds.has(p.id));
      contentsList = contentsList.filter(c => allowedIds.has(c.project_id));
    }

    const userIds = new Set<string>();
    contentsList.forEach(c => {
      if (c.assignee_id) userIds.add(c.assignee_id);
      if (c.created_by) userIds.add(c.created_by);
    });

    if (userIds.size > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', Array.from(userIds));

      const profileMap = new Map((profiles ?? []).map(p => [p.user_id, p]));

      contentsList.forEach(c => {
        c.assignee_profile = c.assignee_id ? profileMap.get(c.assignee_id) ?? null : null;
        c.creator_profile = profileMap.get(c.created_by) ?? null;
        c.project = projectsList.find(p => p.id === c.project_id) ?? null;
      });
    }

    setProjects(projectsList);
    setContents(contentsList);

    // Keep selectedProject in sync
    if (selectedProject) {
      const updated = projectsList.find(p => p.id === selectedProject.id);
      if (updated) setSelectedProject(updated);
      else setSelectedProject(null);
    } else if (role === 'client' && projectsList.length > 0) {
      // Auto-select first project for client users
      setSelectedProject(projectsList[0]);
    }

    setLoading(false);
  }, [user, role]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Apply client palette only on dashboard pages
  useEffect(() => {
    const isClientDashboard = location.pathname.includes('/clients/') && 
                              location.pathname.includes('/dashboard');
    
    if (isClientDashboard) {
      applyClientPalette(selectedProject?.color ?? null);
    } else {
      applyClientPalette(null); // Revert to platform colors
    }
  }, [selectedProject?.color, location.pathname]);

  const updateContentStatus = async (id: string, status: WorkflowStatus) => {
    const content = contents.find(c => c.id === id);
    if (!content || !user) return;

    // Validate that publish_date and publish_time are required when advancing to review (not when going back)
    if (status === 'review' && content.status !== 'approval-client' && content.status !== 'scheduled') {
      const contentData = content as any;
      if (!contentData.publish_date || !contentData.publish_time) {
        throw new Error('Para enviar para revisão, é obrigatório preencher a data e horário da publicação.');
      }
    }

    // Validate that publish_date and publish_time are required when sending to scheduled
    if (status === 'scheduled') {
      const contentData = content as any;
      if (!contentData.publish_date || !contentData.publish_time) {
        throw new Error('Para agendar o post, é obrigatório preencher a data e horário da publicação.');
      }
    }

    await supabase.from('contents').update({ status }).eq('id', id);
    await supabase.from('status_history').insert({
      content_id: id,
      from_status: content.status,
      to_status: status,
      changed_by: user.id,
    });

    setContents(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    if (selectedContent?.id === id) {
      setSelectedContent(prev => prev ? { ...prev, status } : null);
    }
  };

  const updateContentDate = async (id: string, date: string | null) => {
    if (!user) return;
    await supabase.from('contents').update({ publish_date: date }).eq('id', id);
    setContents(prev => prev.map(c => c.id === id ? { ...c, publish_date: date } : c));
    if (selectedContent?.id === id) {
      setSelectedContent(prev => prev ? { ...prev, publish_date: date } : null);
    }
  };

  const updateContentFields = async (id: string, fields: Record<string, any>) => {
    if (!user) return;
    await supabase.from('contents').update(fields as any).eq('id', id);
    setContents(prev => prev.map(c => c.id === id ? { ...c, ...fields } : c));
    if (selectedContent?.id === id) {
      setSelectedContent(prev => prev ? { ...prev, ...fields } : null);
    }
  };

  const deleteContent = async (id: string) => {
    if (!user) return;
    await supabase.from('contents').delete().eq('id', id);
    setContents(prev => prev.filter(c => c.id !== id));
    if (selectedContent?.id === id) {
      setSelectedContent(null);
    }
  };

  return (
    <AppContext.Provider value={{
      contents, projects, selectedProject, setSelectedProject, projectContents,
      selectedContent, setSelectedContent,
      updateContentStatus, updateContentDate, updateContentFields, deleteContent,
      sidebarCollapsed, setSidebarCollapsed,
      loading, refetch: fetchData,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
