import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import ContentPanel from '@/components/content/ContentPanel';
import { useApp } from '@/contexts/AppContext';

const AppLayout = () => {
  const { selectedContent } = useApp();

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <Outlet />
        </main>
        {selectedContent && <ContentPanel />}
      </div>
    </div>
  );
};

export default AppLayout;
