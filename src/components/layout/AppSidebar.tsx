import { useLocation, useNavigate } from 'react-router-dom';
import { Home, FileText, FolderOpen, Calendar, GitBranch, CheckCircle, Image, BarChart3, Settings, ChevronLeft, ChevronRight, Plus, LogOut, Users } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { contrastText, generatePalette } from '@/lib/clientPalette';

const globalNavItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: FolderOpen, label: 'Clientes', path: '/clients' },
  { icon: Settings, label: 'Configurações', path: '/settings' },
];

const clientNavItems = [
  { icon: Home, label: 'Dashboard', path: '/dashboard' },
  { icon: GitBranch, label: 'Workflow', path: '/workflow' },
  { icon: FileText, label: 'Conteúdos', path: '/contents' },
  { icon: Calendar, label: 'Calendário', path: '/calendar' },
  { icon: CheckCircle, label: 'Aprovações', path: '/approvals' },
  { icon: Image, label: 'Biblioteca', path: '/media' },
  { icon: BarChart3, label: 'Relatórios', path: '/reports' },
  { icon: Users, label: 'Usuários', path: '/members' },
];

const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { sidebarCollapsed, setSidebarCollapsed, selectedProject, projects, setSelectedProject } = useApp();
  const { profile, role, signOut } = useAuth();

  const isClient = role === 'client';

  const roleLabels: Record<string, string> = {
    admin: 'Admin',
    moderator: 'Gestor',
    social_media: 'Social Media',
    client: 'Cliente',
  };

  const initials = profile?.display_name
    ? profile.display_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  const clientBasePath = selectedProject ? `/clients/${selectedProject.id}` : '';

  return (
    <aside
      className={cn(
        "flex flex-col h-screen border-r border-sidebar-border-custom transition-all duration-300 flex-shrink-0",
        sidebarCollapsed ? "w-16" : "w-60"
      )}
      style={{ backgroundColor: 'hsl(var(--sidebar-bg))' }}
    >
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
        {globalNavItems.map(item => {
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

        {/* Client sections - only when a client is selected */}
        {selectedProject && (
          <>
            {!sidebarCollapsed && (() => {
              const pal = generatePalette(selectedProject.color);
              return (
                <div className="pt-4 pb-1 px-3">
                  <span
                    className="text-xs uppercase tracking-wider font-semibold truncate px-2 py-0.5 rounded"
                    style={{ backgroundColor: pal[800], color: pal[300] }}
                  >
                    {selectedProject.name}
                  </span>
                </div>
              );
            })()}
            {sidebarCollapsed && (() => {
              const pal = generatePalette(selectedProject.color);
              return (
                <div className="pt-3 pb-1 flex justify-center">
                  <div className="w-6 h-4 rounded text-[8px] font-bold flex items-center justify-center" style={{ backgroundColor: pal[800], color: pal[300] }}>
                    {selectedProject.name.charAt(0)}
                  </div>
                </div>
              );
            })()}
            {clientNavItems
              .filter(item => {
                // Hide management items from client role
                if (isClient && ['/members', '/reports'].includes(item.path)) return false;
                return true;
              })
              .map(item => {
              const fullPath = `${clientBasePath}${item.path}`;
              const isActive = location.pathname === fullPath;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(fullPath)}
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

            {/* Other clients */}
            {projects.filter(p => p.id !== selectedProject.id).length > 0 && (
              <div className="pt-4 -mx-2 space-y-0.5">
                <div className="px-4 mb-1">
                  <span className="text-xs uppercase tracking-wider text-sidebar-fg/60 font-medium">Outros clientes</span>
                </div>
                {projects.filter(p => p.id !== selectedProject.id).map(project => {
                  const pal = generatePalette(project.color);
                  return (
                    <button
                      key={project.id}
                      onClick={() => {
                        setSelectedProject(project);
                        navigate(`/clients/${project.id}/dashboard`);
                      }}
                      className="w-full px-4 py-1.5 text-sm font-medium truncate text-left transition-all hover:brightness-125 active:scale-[0.98]"
                    >
                      <span
                        className="px-2 py-0.5 rounded text-xs uppercase tracking-wider font-semibold"
                        style={{ backgroundColor: pal[800], color: pal[300] }}
                      >
                        {project.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            {sidebarCollapsed && projects.filter(p => p.id !== selectedProject.id).length > 0 && (
              <div className="pt-3 space-y-1">
                {projects.filter(p => p.id !== selectedProject.id).map(project => (
                  <button
                    key={project.id}
                    onClick={() => {
                      setSelectedProject(project);
                      navigate(`/clients/${project.id}/dashboard`);
                    }}
                    className="w-full flex justify-center py-1"
                    title={project.name}
                  >
                    {(project as any).logo_url ? (
                      <img src={(project as any).logo_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold" style={{ backgroundColor: project.color + '25', color: project.color }}>
                        {project.name.charAt(0)}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Quick client list */}
        {!selectedProject && !sidebarCollapsed && (
          <div className="pt-4 -mx-2 space-y-0.5">
            <div className="flex items-center justify-between px-4 mb-1">
              <span className="text-xs uppercase tracking-wider text-sidebar-fg/60 font-medium">Clientes</span>
              <Plus size={14} className="text-sidebar-fg/60 hover:text-sidebar-fg-active cursor-pointer" onClick={() => navigate('/clients')} />
            </div>
            {projects.map(project => {
              const pal = generatePalette(project.color);
              return (
                <button
                  key={project.id}
                  onClick={() => {
                    setSelectedProject(project);
                    navigate(`/clients/${project.id}/dashboard`);
                  }}
                  className="w-full px-4 py-2 text-sm font-semibold truncate text-left transition-all duration-200 hover:brightness-125 active:scale-[0.98]"
                >
                  <span
                    className="px-2 py-0.5 rounded text-xs uppercase tracking-wider font-semibold"
                    style={{ backgroundColor: pal[800], color: pal[300] }}
                  >
                    {project.name}
                  </span>
                </button>
              );
            })}
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
