import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ContentWithRelations, DbProject, WorkflowStatus } from '@/data/types';

interface AppContextType {
  contents: ContentWithRelations[];
  projects: DbProject[];
  selectedContent: ContentWithRelations | null;
  setSelectedContent: (content: ContentWithRelations | null) => void;
  updateContentStatus: (id: string, status: WorkflowStatus) => Promise<void>;
  updateContentDate: (id: string, date: string | null) => Promise<void>;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  loading: boolean;
  refetch: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [contents, setContents] = useState<ContentWithRelations[]>([]);
  const [projects, setProjects] = useState<DbProject[]>([]);
  const [selectedContent, setSelectedContent] = useState<ContentWithRelations | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [projectsRes, contentsRes] = await Promise.all([
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('contents').select('*').order('created_at', { ascending: false }),
    ]);

    const projectsList = (projectsRes.data ?? []) as DbProject[];
    const contentsList = (contentsRes.data ?? []) as ContentWithRelations[];

    // Fetch profiles for assignees and creators
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
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateContentStatus = async (id: string, status: WorkflowStatus) => {
    const content = contents.find(c => c.id === id);
    if (!content || !user) return;

    await supabase.from('contents').update({ status }).eq('id', id);

    // Record status change
    await supabase.from('status_history').insert({
      content_id: id,
      from_status: content.status,
      to_status: status,
      changed_by: user.id,
    });

    // Update local state
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

  return (
    <AppContext.Provider value={{
      contents, projects, selectedContent, setSelectedContent,
      updateContentStatus, updateContentDate, sidebarCollapsed, setSidebarCollapsed,
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
