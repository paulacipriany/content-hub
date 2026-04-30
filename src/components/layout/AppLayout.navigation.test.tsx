import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import React from 'react';

// Mocks
const setSelectedProject = vi.fn();
const setSelectedContent = vi.fn();

const mockProject = { id: 'proj-1', name: 'Kestal', color: '#000' } as any;

let mockAppState: any = {
  selectedContent: null,
  setSelectedContent,
  contents: [],
  projects: [mockProject],
  selectedProject: mockProject,
  setSelectedProject,
  loading: false,
};

let mockRole: string | null = 'admin';

vi.mock('@/contexts/AppContext', () => ({
  useApp: () => mockAppState,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ role: mockRole }),
}));

vi.mock('@/hooks/useRealtimeNotifications', () => ({
  useRealtimeNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    markAsRead: () => {},
    markAllAsRead: () => {},
  }),
}));

vi.mock('./AppSidebar', () => ({ default: () => <div data-testid="sidebar" /> }));
vi.mock('@/components/content/ContentPanel', () => ({ default: () => <div /> }));

import AppLayout from './AppLayout';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<AppLayout />} />
      </Routes>
    </MemoryRouter>
  );

describe('AppLayout — clear selectedProject on global routes', () => {
  beforeEach(() => {
    setSelectedProject.mockClear();
    setSelectedContent.mockClear();
    mockRole = 'admin';
    mockAppState.selectedProject = mockProject;
  });

  it('clears selected project when navigating to Home (/)', () => {
    renderAt('/');
    expect(setSelectedProject).toHaveBeenCalledWith(null);
  });

  it('clears selected project when navigating to Configurações (/settings)', () => {
    renderAt('/settings');
    expect(setSelectedProject).toHaveBeenCalledWith(null);
  });

  it('clears selected project when navigating to Tarefas Gerais (/all-tasks)', () => {
    renderAt('/all-tasks');
    expect(setSelectedProject).toHaveBeenCalledWith(null);
  });

  it('clears selected project when navigating to Projetos (/clients)', () => {
    renderAt('/clients');
    expect(setSelectedProject).toHaveBeenCalledWith(null);
  });

  it('keeps selected project when navigating into a project route', () => {
    renderAt('/clients/proj-1/dashboard');
    expect(setSelectedProject).not.toHaveBeenCalled();
  });

  it('does NOT clear selected project for client role on global routes', () => {
    mockRole = 'client';
    mockAppState.selectedProject = mockProject;
    renderAt('/settings');
    expect(setSelectedProject).not.toHaveBeenCalledWith(null);
  });
});
