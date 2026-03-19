import { useNotificationsContext } from '@/contexts/NotificationsContext';
export type { Notification, NotificationType } from '@/contexts/NotificationsContext';
export const useRealtimeNotifications = useNotificationsContext;
