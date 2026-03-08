import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { STATUS_LABELS, WorkflowStatus } from '@/data/types';
import { toast } from '@/hooks/use-toast';

export type NotificationType = 'status_change' | 'new_comment' | 'assignee_change' | 'task_assigned';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  contentId: string;
  createdAt: string;
  read: boolean;
}

// Only notify for meaningful status transitions
const RELEVANT_STATUS_TARGETS: WorkflowStatus[] = ['review', 'approval-client', 'scheduled', 'published'];

export function useRealtimeNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const profileCacheRef = useRef<Map<string, string>>(new Map());

  const getDisplayName = async (userId: string): Promise<string> => {
    if (profileCacheRef.current.has(userId)) return profileCacheRef.current.get(userId)!;
    const { data } = await supabase.from('profiles').select('display_name').eq('user_id', userId).single();
    const name = data?.display_name ?? 'Alguém';
    profileCacheRef.current.set(userId, name);
    return name;
  };

  const addNotification = (n: Notification) => {
    setNotifications(prev => [n, ...prev].slice(0, 50));
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('realtime-notifications')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'contents' },
        async (payload) => {
          const oldData = payload.old as any;
          const newData = payload.new as any;
          const contentTitle = newData.title ?? 'Conteúdo';
          const isCreator = newData.created_by === user.id;
          const isAssignee = newData.assignee_id === user.id;

          // Assignee change — only notify the newly assigned user
          const oldAssignee = oldData.assignee_id;
          const newAssignee = newData.assignee_id;
          if (newAssignee && newAssignee !== oldAssignee && newAssignee === user.id) {
            const assignerName = await getDisplayName(oldData.created_by ?? newData.created_by);
            const n: Notification = {
              id: crypto.randomUUID(),
              type: 'assignee_change',
              title: 'Você foi atribuído',
              message: `${assignerName} atribuiu você ao conteúdo "${contentTitle}"`,
              contentId: newData.id,
              createdAt: new Date().toISOString(),
              read: false,
            };
            addNotification(n);
            toast({ title: '👤 Nova atribuição', description: n.message });
          }

          // Status change — only for relevant transitions and involved users
          const oldStatus = oldData.status as WorkflowStatus;
          const newStatus = newData.status as WorkflowStatus;
          if (oldStatus === newStatus) return;
          if (!RELEVANT_STATUS_TARGETS.includes(newStatus)) return;
          if (!isCreator && !isAssignee) return;

          const fromLabel = STATUS_LABELS[oldStatus] ?? oldStatus;
          const toLabel = STATUS_LABELS[newStatus] ?? newStatus;

          const n: Notification = {
            id: crypto.randomUUID(),
            type: 'status_change',
            title: 'Status atualizado',
            message: `"${contentTitle}" movido de ${fromLabel} → ${toLabel}`,
            contentId: newData.id,
            createdAt: new Date().toISOString(),
            read: false,
          };
          addNotification(n);
          toast({ title: '📋 Status atualizado', description: n.message });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments' },
        async (payload) => {
          const comment = payload.new as any;
          if (comment.user_id === user.id) return;

          // Only notify creator/assignee of the content
          const { data: content } = await supabase
            .from('contents')
            .select('title, created_by, assignee_id')
            .eq('id', comment.content_id)
            .single();
          if (!content) return;

          const isInvolved = content.created_by === user.id || content.assignee_id === user.id;
          if (!isInvolved) return;

          const authorName = await getDisplayName(comment.user_id);
          const n: Notification = {
            id: crypto.randomUUID(),
            type: 'new_comment',
            title: 'Novo comentário',
            message: `${authorName} comentou em "${content.title}"`,
            contentId: comment.content_id,
            createdAt: new Date().toISOString(),
            read: false,
          };
          addNotification(n);
          toast({ title: '💬 Novo comentário', description: n.message });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'project_tasks' },
        async (payload) => {
          const task = payload.new as any;
          if (task.assigned_to !== user.id) return;
          if (task.created_by === user.id) return;

          const creatorName = await getDisplayName(task.created_by);
          const n: Notification = {
            id: crypto.randomUUID(),
            type: 'task_assigned',
            title: 'Nova tarefa',
            message: `${creatorName} atribuiu a tarefa "${task.text}" a você`,
            contentId: task.id,
            createdAt: new Date().toISOString(),
            read: false,
          };
          addNotification(n);
          toast({ title: '✅ Nova tarefa', description: n.message });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { notifications, unreadCount, markAsRead, markAllAsRead };
}
