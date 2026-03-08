import { useLocation, useNavigate } from 'react-router-dom';
import { Home, FileText, FolderOpen, Calendar, GitBranch, CheckCircle, Image, BarChart3, Settings, ChevronLeft, ChevronRight, Plus, LogOut } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: FileText, label: 'Meus Conteúdos', path: '/contents' },
  { icon: FolderOpen, label: 'Projetos', path: '/projects' },
  { icon: Calendar, label: 'Calendário', path: '/calendar' },
  { icon: GitBranch, label: 'Workflow', path: '/workflow' },
  { icon: CheckCircle, label: 'Aprovações', path: '/approvals' },
  { icon: Image, label: 'Biblioteca', path: '/media' },
  { icon: BarChart3, label: 'Relatórios', path: '/reports' },
  { icon: Settings, label: 'Configurações', path: '/settings' },
];

const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { sidebarCollapsed, setSidebarCollapsed } = useApp();
  const { profile, role, signOut } = useAuth();

  const roleLabels: Record<string, string> = {
    admin: 'Admin',
    moderator: 'Gestor',
    social_media: 'Social Media',
    client: 'Cliente',
  };

  const initials = profile?.display_name
    ? profile.display_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  return (
    <aside className={cn(
      "flex flex-col h-screen bg-sidebar-bg border-r border-sidebar-border-custom transition-all duration-300 flex-shrink-0",
      sidebarCollapsed ? "w-16" : "w-60"
    )}>
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-14 border-b border-sidebar-border-custom">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <span className="text-primary-foreground font-bold text-sm">S</span>
        </div>
        {!sidebarCollapsed && (
          <span className="text-sidebar-fg-active font-semibold text-base tracking-tight">SocialFlow</span>
        )}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="ml-auto text-sidebar-fg hover:text-sidebar-fg-active transition-colors"
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto scrollbar-thin">
        {navItems.map(item => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-sidebar-hover text-sidebar-fg-active"
                  : "text-sidebar-fg hover:bg-sidebar-hover hover:text-sidebar-fg-active"
              )}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <item.icon size={18} className="flex-shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          );
        })}

        {/* Projects section */}
        {!sidebarCollapsed && (
          <div className="pt-4">
            <div className="flex items-center justify-between px-3 mb-1">
              <span className="text-xs uppercase tracking-wider text-sidebar-fg/60 font-medium">Projetos</span>
              <Plus size={14} className="text-sidebar-fg/60 hover:text-sidebar-fg-active cursor-pointer" />
            </div>
            {mockProjects.map(project => (
              <button
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="flex items-center gap-2.5 w-full px-3 py-1.5 rounded-md text-sm text-sidebar-fg hover:bg-sidebar-hover hover:text-sidebar-fg-active transition-colors"
              >
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
                <span className="truncate">{project.name}</span>
              </button>
            ))}
          </div>
        )}
      </nav>

      <div className="px-3 py-3 border-t border-sidebar-border-custom">
        <div className={cn("flex items-center gap-2.5", sidebarCollapsed && "justify-center")}>
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-primary text-xs font-semibold">{initials}</span>
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-sm text-sidebar-fg-active font-medium truncate">{profile?.display_name ?? 'Usuário'}</p>
              <p className="text-xs text-sidebar-fg/60 truncate">{role ? roleLabels[role] : ''}</p>
            </div>
          )}
          {!sidebarCollapsed && (
            <button onClick={signOut} className="text-sidebar-fg hover:text-sidebar-fg-active transition-colors" title="Sair">
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
