import React, { createContext, useContext, useState } from 'react';
import { ContentItem, mockContents, WorkflowStatus } from '@/data/mockData';

interface AppContextType {
  contents: ContentItem[];
  selectedContent: ContentItem | null;
  setSelectedContent: (content: ContentItem | null) => void;
  updateContentStatus: (id: string, status: WorkflowStatus) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [contents, setContents] = useState<ContentItem[]>(mockContents);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const updateContentStatus = (id: string, status: WorkflowStatus) => {
    setContents(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    if (selectedContent?.id === id) {
      setSelectedContent(prev => prev ? { ...prev, status } : null);
    }
  };

  return (
    <AppContext.Provider value={{ contents, selectedContent, setSelectedContent, updateContentStatus, sidebarCollapsed, setSidebarCollapsed }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
