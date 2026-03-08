import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { STATUS_LABELS, WorkflowStatus } from '@/data/types';
import { toast } from '@/hooks/use-toast';

export type NotificationType = 'status_change' | 'new_comment' | 'assignee_change';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  contentId: string;
  createdAt: string;
  read: boolean;
}

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
          const oldStatus = (payload.old as any).status as WorkflowStatus;
          const newStatus = (payload.new as any).status as WorkflowStatus;
          if (oldStatus === newStatus) return;

          const contentTitle = (payload.new as any).title ?? 'Conteúdo';
          const fromLabel = STATUS_LABELS[oldStatus] ?? oldStatus;
          const toLabel = STATUS_LABELS[newStatus] ?? newStatus;

          const notification: Notification = {
            id: crypto.randomUUID(),
            type: 'status_change',
            title: 'Status atualizado',
            message: `"${contentTitle}" movido de ${fromLabel} → ${toLabel}`,
            contentId: (payload.new as any).id,
            createdAt: new Date().toISOString(),
            read: false,
          };

          setNotifications(prev => [notification, ...prev].slice(0, 50));
          toast({
            title: '📋 Status atualizado',
            description: notification.message,
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments' },
        async (payload) => {
          const comment = payload.new as any;
          // Don't notify for own comments
          if (comment.user_id === user.id) return;

          const authorName = await getDisplayName(comment.user_id);
          // Get content title
          const { data: content } = await supabase.from('contents').select('title').eq('id', comment.content_id).single();
          const contentTitle = content?.title ?? 'um conteúdo';

          const notification: Notification = {
            id: crypto.randomUUID(),
            type: 'new_comment',
            title: 'Novo comentário',
            message: `${authorName} comentou em "${contentTitle}"`,
            contentId: comment.content_id,
            createdAt: new Date().toISOString(),
            read: false,
          };

          setNotifications(prev => [notification, ...prev].slice(0, 50));
          toast({
            title: '💬 Novo comentário',
            description: notification.message,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { notifications, unreadCount, markAsRead, markAllAsRead };
}
