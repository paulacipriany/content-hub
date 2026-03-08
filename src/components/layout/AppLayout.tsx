import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import ContentPanel from '@/components/content/ContentPanel';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { createContext, useContext, useEffect } from 'react';
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
  const { selectedContent, setSelectedContent, contents, projects, setSelectedProject, loading } = useApp();
  const { role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const notifs = useRealtimeNotifications();

  // Close content panel on route change
  useEffect(() => {
    if (selectedContent) {
      setSelectedContent(null);
    }
  }, [location.pathname]);

  // Redirect client-role users from home to their first project dashboard
  useEffect(() => {
    if (role === 'client' && location.pathname === '/' && !loading && projects.length > 0) {
      const first = projects[0];
      setSelectedProject(first);
      navigate(`/clients/${first.id}/dashboard`, { replace: true });
    }
  }, [role, location.pathname, loading, projects]);

  const handleNotificationClick = (contentId: string) => {
    const content = contents.find(c => c.id === contentId);
    if (content) setSelectedContent(content);
  };

  return (
    <NotificationContext.Provider value={notifs}>
      <div className="flex h-screen overflow-hidden">
        <AppSidebar />
        <div className="flex-1 flex overflow-hidden">
          {selectedContent ? (
            <ContentPanel />
          ) : (
            <main className="flex-1 overflow-y-auto scrollbar-thin">
              <Outlet context={notifs} />
            </main>
          )}
        </div>
      </div>
    </NotificationContext.Provider>
  );
};

export default AppLayout;
