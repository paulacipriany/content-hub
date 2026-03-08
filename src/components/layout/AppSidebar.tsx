import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Home, FileText, FolderOpen, Calendar, GitBranch, CheckCircle, Image, BarChart3, Settings, ChevronLeft, ChevronRight, Plus, LogOut, Users, Sun, Moon, ListTodo, Lightbulb, ClipboardList, Eye } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { contrastText, generatePalette } from '@/lib/clientPalette';
import { useTheme } from 'next-themes';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';

const globalNavItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: FolderOpen, label: 'Clientes', path: '/clients' },
  { icon: Users, label: 'Usuários', path: '/users', adminOnly: true },
  { icon: Settings, label: 'Configurações', path: '/settings' },
];

const clientNavItems = [
  { icon: Home, label: 'Dashboard', path: '/dashboard' },
  { icon: GitBranch, label: 'Workflow', path: '/workflow' },
  { icon: FileText, label: 'Conteúdos', path: '/contents' },
  { icon: Lightbulb, label: 'Banco de Ideias', path: '/ideas', hideFromClient: true },
  { icon: Eye, label: 'Revisão', path: '/review', hideFromClient: true },
  { icon: ListTodo, label: 'Tarefas', path: '/tasks' },
  { icon: Calendar, label: 'Calendário', path: '/calendar' },
  { icon: CheckCircle, label: 'Aprovações', path: '/approvals' },
  { icon: Image, label: 'Biblioteca', path: '/media' },
  { icon: ClipboardList, label: 'Relatório de Postagens', path: '/post-reports', hideFromClient: true },
  { icon: BarChart3, label: 'Relatórios', path: '/reports', hideFromClient: true },
  { icon: Users, label: 'Usuários', path: '/members', hideFromClient: true },
];

const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { sidebarCollapsed, setSidebarCollapsed, selectedProject, projects, setSelectedProject, contents } = useApp();
  const { profile, role, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  // Load saved theme from profile
  useEffect(() => {
    if (profile?.theme) {
      setTheme(profile.theme);
    }
  }, [profile?.theme]);

  const handleThemeChange = async (dark: boolean) => {
    const newTheme = dark ? 'dark' : 'light';
    setTheme(newTheme);
    if (profile) {
      await supabase.from('profiles').update({ theme: newTheme } as any).eq('id', profile.id);
    }
  };

  const isClient = role === 'client';

  // Count posts pending approval for selected project
  const approvalCount = selectedProject
    ? contents.filter(c => c.project_id === selectedProject.id && ['approval-internal', 'approval-client'].includes(c.status)).length
    : 0;

  // Count posts pending review for selected project
  const reviewCount = selectedProject
    ? contents.filter(c => c.project_id === selectedProject.id && c.status === 'review').length
    : 0;

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
        {!isClient && globalNavItems
          .filter(item => !(item as any).adminOnly || role === 'admin')
          .map(item => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-left transition-colors",
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
            {!sidebarCollapsed && (
              <div className="pt-4 pb-1 px-3">
                <span
                  className="text-xs uppercase tracking-wider font-semibold truncate px-2 py-0.5 rounded"
                  style={{ backgroundColor: selectedProject.color, color: contrastText(selectedProject.color) }}
                >
                  {selectedProject.name}
                </span>
              </div>
            )}
            {sidebarCollapsed && (
              <div className="pt-3 pb-1 flex justify-center">
                <div className="w-6 h-4 rounded text-[8px] font-bold flex items-center justify-center" style={{ backgroundColor: selectedProject.color, color: contrastText(selectedProject.color) }}>
                  {selectedProject.name.charAt(0)}
                </div>
              </div>
            )}
            {clientNavItems
              .filter(item => {
                if (isClient && (item as any).hideFromClient) return false;
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
                    "flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-left transition-colors",
                    isActive
                      ? "bg-sidebar-hover text-sidebar-fg-active"
                      : "text-sidebar-fg hover:bg-sidebar-hover hover:text-sidebar-fg-active"
                  )}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <item.icon size={18} className="flex-shrink-0" />
                  {!sidebarCollapsed && <span className="flex-1 text-left">{item.label}</span>}
                  {item.path === '/approvals' && approvalCount > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#d7ff73', color: '#1a1a1a' }}>
                      {approvalCount}
                    </span>
                  )}
                  {item.path === '/review' && reviewCount > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#d7ff73', color: '#1a1a1a' }}>
                      {reviewCount}
                    </span>
                  )}
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
                        style={{ backgroundColor: project.color, color: contrastText(project.color) }}
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
                    style={{ backgroundColor: project.color, color: contrastText(project.color) }}
                  >
                    {project.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </nav>

      {/* Theme toggle */}
      <div className={cn("px-3 py-2 border-t border-sidebar-border-custom", sidebarCollapsed && "flex justify-center")}>
        {sidebarCollapsed ? (
          <button
            onClick={() => handleThemeChange(!isDark)}
            className="w-8 h-8 rounded-md flex items-center justify-center text-sidebar-fg hover:text-sidebar-fg-active hover:bg-sidebar-hover transition-colors"
            title={isDark ? 'Modo claro' : 'Modo escuro'}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sidebar-fg">
              {isDark ? <Moon size={14} /> : <Sun size={14} />}
              <span className="text-xs">{isDark ? 'Escuro' : 'Claro'}</span>
            </div>
            <Switch
              checked={isDark}
              onCheckedChange={handleThemeChange}
              className="h-4 w-8 data-[state=checked]:bg-primary"
            />
          </div>
        )}
      </div>

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
