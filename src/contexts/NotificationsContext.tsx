import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
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

const RELEVANT_STATUS_TARGETS: WorkflowStatus[] = ['review', 'approval-client', 'scheduled', 'published'];

interface NotificationsContextData {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextData>({} as NotificationsContextData);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const profileCacheRef = useRef<Map<string, string>>(new Map());

  const getDisplayName = async (userId: string): Promise<string> => {
    if (!userId) return 'Alguém';
    if (profileCacheRef.current.has(userId)) return profileCacheRef.current.get(userId)!;
    const { data } = await supabase.from('profiles').select('display_name').eq('user_id', userId).single();
    const name = data?.display_name ?? 'Alguém';
    profileCacheRef.current.set(userId, name);
    return name;
  };

  const fetchNotifications = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('notifications' as any)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching notifications:', error);
      return;
    }

    if (data) {
      setNotifications((data as any[]).map(d => ({
        id: d.id,
        type: d.type as NotificationType,
        title: d.title,
        message: d.message,
        contentId: d.content_id,
        createdAt: d.created_at,
        read: d.read
      })));
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user?.id]);

  // Save a notification to DB for a specific user (can be different from current user)
  const saveNotificationToDB = async (targetUserId: string, n: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
    const { error } = await supabase.from('notifications' as any).insert({
      user_id: targetUserId,
      type: n.type,
      title: n.title,
      message: n.message,
      content_id: n.contentId || null,
      read: false,
    });
    if (error) console.error('Failed to save notification to DB:', error);
  };

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    if (user) {
      const { error } = await supabase
        .from('notifications' as any)
        .update({ read: true })
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) console.error('markAsRead DB error:', error);
    }
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    if (user) {
      const { error } = await supabase
        .from('notifications' as any)
        .update({ read: true })
        .eq('user_id', user.id);
      if (error) console.error('markAllAsRead DB error:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (user) {
      await supabase.from('notifications' as any).delete().eq('id', id).eq('user_id', user.id);
    }
  };

  const clearAll = async () => {
    setNotifications([]);
    if (user) {
      await supabase.from('notifications' as any).delete().eq('user_id', user.id);
    }
  };

  useEffect(() => {
    if (!user) return;

    // Only listen to the notifications table — DB triggers handle generating them
    const notifChannel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          const n = payload.new;
          setNotifications(prev => {
            if (prev.some(p => p.id === n.id)) return prev; // deduplicate
            const newNotif: Notification = {
              id: n.id,
              type: n.type as NotificationType,
              title: n.title,
              message: n.message,
              contentId: n.content_id,
              createdAt: n.created_at,
              read: n.read,
            };
            let icon = '🔔';
            if (n.type === 'status_change') icon = '📋';
            else if (n.type === 'new_comment') icon = '💬';
            else if (n.type === 'assignee_change') icon = '👤';
            else if (n.type === 'task_assigned') icon = '✅';
            toast({ title: `${icon} ${n.title}`, description: n.message });
            return [newNotif, ...prev].slice(0, 50);
          });
        }
      )
      .on(
        'postgres_changes' as any,
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          const updated = payload.new;
          setNotifications(prev => prev.map(n => n.id === updated.id ? { ...n, read: updated.read } : n));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notifChannel);
    };
  }, [user?.id]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAll }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotificationsContext = () => useContext(NotificationsContext);
