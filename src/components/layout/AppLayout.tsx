import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import ContentPanel from '@/components/content/ContentPanel';
import { useApp } from '@/contexts/AppContext';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { createContext, useContext } from 'react';
import { Notification } from '@/hooks/useRealtimeNotifications';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  markAsRead: () => {},
  markAllAsRead: () => {},
});

export const useNotifications = () => useContext(NotificationContext);

const AppLayout = () => {
  const { selectedContent, setSelectedContent, contents } = useApp();
  const notifs = useRealtimeNotifications();

  const handleNotificationClick = (contentId: string) => {
    const content = contents.find(c => c.id === contentId);
    if (content) setSelectedContent(content);
  };

  return (
    <NotificationContext.Provider value={notifs}>
      <div className="flex h-screen overflow-hidden">
        <AppSidebar />
        <div className="flex-1 flex overflow-hidden">
          <main className="flex-1 overflow-y-auto scrollbar-thin">
            <Outlet context={notifs} />
          </main>
          {selectedContent && <ContentPanel />}
        </div>
      </div>
    </NotificationContext.Provider>
  );
};

export default AppLayout;
