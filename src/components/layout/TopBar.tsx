import { Search, Bell, ArrowRightLeft, MessageSquare, CheckCheck, ChevronDown } from 'lucide-react';
import CreateContentDialog from '@/components/content/CreateContentDialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/components/layout/AppLayout';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface TopBarProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

const TopBar = ({ title, subtitle, actions }: TopBarProps) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { contents, setSelectedContent, projects, selectedProject, setSelectedProject } = useApp();
  const { role } = useAuth();
  const navigate = useNavigate();

  const handleNotificationClick = (contentId: string) => {
    const content = contents.find(c => c.id === contentId);
    if (content) setSelectedContent(content);
  };

  const handleSelectClient = (project: typeof projects[number]) => {
    setSelectedProject(project);
    navigate(`/clients/${project.id}/dashboard`);
  };

  return (
    <header className="flex items-center justify-between h-14 px-6 border-b border-border bg-card flex-shrink-0">
      <div className="flex items-center gap-4">
        {role !== 'client' && (
          <>
            {/* Client selector */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 h-9 px-3 rounded-lg bg-secondary hover:bg-accent transition-colors text-sm font-medium text-foreground">
                  {selectedProject ? (
                    <>
                      {(selectedProject as any).logo_url
                        ? <img src={(selectedProject as any).logo_url} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                        : <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: selectedProject.color }} />
                      }
                      <span className="max-w-[140px] truncate">{selectedProject.name}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Selecionar cliente</span>
                  )}
                  <ChevronDown size={14} className="text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-1" align="start">
                {projects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectClient(p)}
                    className={cn(
                      "flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-sm transition-colors",
                      selectedProject?.id === p.id
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover:bg-secondary"
                    )}
                  >
                    {(p as any).logo_url
                      ? <img src={(p as any).logo_url} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                      : <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                    }
                    <span className="truncate">{p.name}</span>
                  </button>
                ))}
                {projects.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">Nenhum cliente criado</p>
                )}
              </PopoverContent>
            </Popover>

            <div className="border-l border-border h-6" />
          </>
        )}

        <div>
          {title && <h1 className="text-lg font-semibold text-foreground">{title}</h1>}
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3">

        <Popover>
          <PopoverTrigger asChild>
            <button className="relative w-9 h-9 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors">
              <Bell size={18} className="text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Notificações</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <CheckCheck size={12} /> Marcar todas como lidas
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma notificação
                </div>
              ) : (
                notifications.slice(0, 20).map(n => (
                  <button
                    key={n.id}
                    onClick={() => {
                      markAsRead(n.id);
                      handleNotificationClick(n.contentId);
                    }}
                    className={cn(
                      "w-full text-left px-4 py-3 border-b border-border last:border-b-0 hover:bg-secondary/50 transition-colors flex gap-3",
                      !n.read && "bg-primary/5"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                      n.type === 'status_change' ? "bg-primary/10" : "bg-accent"
                    )}>
                      {n.type === 'status_change'
                        ? <ArrowRightLeft size={14} className="text-primary" />
                        : <MessageSquare size={14} className="text-foreground" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">{n.title}</span>
                        {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <span className="text-[10px] text-muted-foreground mt-1 block">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ptBR })}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        {actions}
        {selectedProject && !actions && <CreateContentDialog defaultProjectId={selectedProject.id} />}
      </div>
    </header>
  );
};

export default TopBar;
