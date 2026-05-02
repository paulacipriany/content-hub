import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ContentWithRelations, DbProject, WorkflowStatus } from '@/data/types';
import { cn, withTimeout } from '@/lib/utils';
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
  pendingUsersCount: number;
  fetchPendingUsersCount: () => Promise<void>;
  refetch: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role, profile } = useAuth();
  const location = useLocation();
  const [contents, setContents] = useState<ContentWithRelations[]>([]);
  const [projects, setProjects] = useState<DbProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<DbProject | null>(null);
  const [selectedContent, setSelectedContent] = useState<ContentWithRelations | null>(null);
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(() => {
    try { return localStorage.getItem('sidebarCollapsed') === '1'; } catch { return false; }
  });

  // Sync from profile when it loads/changes
  useEffect(() => {
    const remote = (profile as any)?.sidebar_collapsed;
    if (typeof remote === 'boolean') {
      setSidebarCollapsedState(remote);
      try { localStorage.setItem('sidebarCollapsed', remote ? '1' : '0'); } catch {}
    }
  }, [profile?.id, (profile as any)?.sidebar_collapsed]);

  const setSidebarCollapsed = useCallback((v: boolean) => {
    setSidebarCollapsedState(v);
    try { localStorage.setItem('sidebarCollapsed', v ? '1' : '0'); } catch {}
    if (profile?.id) {
      supabase.from('profiles').update({ sidebar_collapsed: v } as any).eq('id', profile.id).then(({ error }) => {
        if (error) console.warn('Failed to persist sidebar_collapsed:', error);
      });
    }
  }, [profile?.id]);

  const [loading, setLoading] = useState(true);
  const [pendingUsersCount, setPendingUsersCount] = useState(0);

  const fetchPendingUsersCount = useCallback(async () => {
    if (role === 'admin' || role === 'moderator') {
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('approved', false);
      setPendingUsersCount(count ?? 0);
    }
  }, [role]);

  const projectContents = selectedProject
    ? contents.filter(c => c.project_id === selectedProject.id)
    : contents;

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Initial fetch of pending users
      await withTimeout(fetchPendingUsersCount());

      const [projectsRes, contentsRes] = await withTimeout(Promise.all([
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.from('contents').select('*').order('created_at', { ascending: false }).limit(200),
      ]), 25000);

      let projectsList = (projectsRes.data ?? []) as DbProject[];
      let contentsList = (contentsRes.data ?? []) as ContentWithRelations[];

      // For client-role users, only show projects they are members of
      if (role === 'client') {
        const { data: memberships } = await withTimeout(supabase
          .from('project_members')
          .select('project_id')
          .eq('user_id', user.id));
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
        const { data: profiles } = await withTimeout(supabase
          .from('profiles')
          .select('*')
          .in('user_id', Array.from(userIds)));

        const profileMap = new Map((profiles ?? []).map(p => [p.user_id, p]));

        contentsList.forEach(c => {
          c.assignee_profile = c.assignee_id ? profileMap.get(c.assignee_id) ?? null : null;
          c.creator_profile = profileMap.get(c.created_by) ?? null;
          c.project = projectsList.find(p => p.id === c.project_id) ?? null;
        });
      }

      setProjects(projectsList);
      setContents(contentsList);

      // Sync selectedProject or auto-select for client using functional update to avoid dependencies
      setSelectedProject(current => {
        if (current) {
          const updated = projectsList.find(p => p.id === current.id);
          return updated || null;
        } else if (role === 'client' && projectsList.length > 0) {
          return projectsList[0];
        }
        return current;
      });
    } catch (error: any) {
      console.error('Error fetching app data:', error);
      toast.error('Erro ao carregar dados: ' + (error.message || 'Verifique sua conexão'));
    } finally {
      setLoading(false);
    }
  }, [user, role, fetchPendingUsersCount]);

  useEffect(() => {
    fetchData();

    // Subscribe to profiles for pending users count if admin/moderator
    let profilesSub: any;
    if (role === 'admin' || role === 'moderator') {
      profilesSub = supabase.channel('profiles-admin-count')
        .on('postgres_changes' as any, { event: '*', table: 'profiles' }, () => {
          fetchPendingUsersCount();
        })
        .subscribe();
    }

    return () => {
      if (profilesSub) supabase.removeChannel(profilesSub);
    };
  }, [fetchData, role, fetchPendingUsersCount]);

  // Apply client palette only on client-scoped pages
  useEffect(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const isClientScoped = pathSegments[0] === 'clients' && pathSegments.length >= 2;
    
    if (isClientScoped) {
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

    const { error: updateError } = await supabase.from('contents').update({ status }).eq('id', id);
    if (updateError) {
      console.error('Update status error:', updateError);
      throw new Error(`Erro ao atualizar status: ${updateError.message}`);
    }

    await supabase.from('status_history').insert({
      content_id: id,
      from_status: content.status,
      to_status: status,
      changed_by: user.id,
    });

    // Notify approvers if status changed to approval-client
    if (status === 'approval-client') {
      try {
        const { data: approvers } = await supabase
          .from('content_approvers' as any)
          .select('user_id')
          .eq('content_id', id);
        
        if (approvers && approvers.length > 0) {
          const notifs = approvers.map((a: any) => ({
            user_id: a.user_id,
            type: 'status_change',
            title: 'Novo conteúdo para aprovação',
            message: `O conteúdo "${content.title}" está aguardando sua revisão.`,
            content_id: id,
            read: false,
          }));
          await supabase.from('notifications' as any).insert(notifs);
        }
      } catch (err) {
        console.error('Failed to notify approvers:', err);
      }
    }

    setContents(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    if (selectedContent?.id === id) {
      setSelectedContent(prev => prev ? { ...prev, status } : null);
    }
  };

  const updateContentDate = async (id: string, date: string | null) => {
    if (!user) return;
    const { error } = await supabase.from('contents').update({ publish_date: date }).eq('id', id);
    if (error) {
      console.error('Update date error:', error);
      toast.error('Erro ao atualizar data: ' + error.message);
      return;
    }
    setContents(prev => prev.map(c => c.id === id ? { ...c, publish_date: date } : c));
    if (selectedContent?.id === id) {
      setSelectedContent(prev => prev ? { ...prev, publish_date: date } : null);
    }
  };

  const updateContentFields = async (id: string, fields: Record<string, any>) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('contents').update(fields as any).eq('id', id);
      if (error) throw error;
      
      setContents(prev => prev.map(c => c.id === id ? { ...c, ...fields } : c));
      if (selectedContent?.id === id) {
        setSelectedContent(prev => prev ? { ...prev, ...fields } : null);
      }
    } catch (error: any) {
      console.error('Error updating content fields:', error);
      // We don't want to spam toasts for auto-saves, but for manual ones it's good
      // Maybe check if it's a "critical" field or just log it
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
      loading, pendingUsersCount, fetchPendingUsersCount, refetch: fetchData,
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
