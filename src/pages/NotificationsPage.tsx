import TopBar from '@/components/layout/TopBar';
import { useRealtimeNotifications, Notification } from '@/hooks/useRealtimeNotifications';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, MessageSquare, UserPlus, ClipboardList, Check, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const NotificationsPage = () => {
  const { notifications, markAsRead, markAllAsRead, deleteNotification, clearAll } = useRealtimeNotifications();
  const { setSelectedProject, projects } = useApp();
  const navigate = useNavigate();

  const getIcon = (type: string) => {
    switch (type) {
      case 'status_change': return <ClipboardList size={18} className="text-blue-500" />;
      case 'new_comment': return <MessageSquare size={18} className="text-emerald-500" />;
      case 'assignee_change': return <UserPlus size={18} className="text-purple-500" />;
      case 'task_assigned': return <CheckCircle2 size={18} className="text-orange-500" />;
      default: return <ClipboardList size={18} className="text-muted-foreground" />;
    }
  };

  const handleNotificationClick = async (n: Notification) => {
    if (!n.read) {
      markAsRead(n.id);
    }
    
    // Find project and navigate
    const { data: contentData } = await supabase.from('contents').select('project_id').eq('id', n.contentId).single();
    if (contentData?.project_id) {
      const proj = projects.find(p => p.id === contentData.project_id);
      if (proj) {
        setSelectedProject(proj);
        navigate(`/clients/${proj.id}/content?content=${n.contentId}`);
      }
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNotification(id);
    toast({ title: "Notificação excluída" });
  };

  const handleDeleteAll = () => {
    clearAll();
    toast({ title: "Histórico limpo" });
  };
  
  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  return (
    <>
      <TopBar title="Notificações" subtitle="Histórico de atividades e alertas" />
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xl font-bold text-foreground">Histórico de Notificações</h2>
          <div className="flex items-center gap-2">
            {notifications.some(n => !n.read) && (
              <button 
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-secondary-foreground text-xs font-medium rounded-md hover:bg-secondary/80 transition-colors"
              >
                <Check size={14} /> Marcar todas como lidas
              </button>
            )}
            {notifications.length > 0 && (
              <button 
                onClick={handleDeleteAll}
                className="flex items-center gap-1.5 px-3 py-1.5 text-destructive bg-destructive/10 text-xs font-medium rounded-md hover:bg-destructive/20 transition-colors"
              >
                <Trash2 size={14} /> Limpar histórico
              </button>
            )}
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-card border border-border rounded-xl text-center">
            <ClipboardList size={40} className="text-muted-foreground/30 mb-3" />
            <h3 className="text-base font-medium text-foreground mb-1">Nenhuma notificação</h3>
            <p className="text-sm text-muted-foreground max-w-[250px]">
              Seu histórico está limpo. As próximas atividades aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
            {notifications.map((n) => (
              <div 
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={cn(
                  "p-4 flex items-start gap-4 transition-colors cursor-pointer group hover:bg-muted/50",
                  !n.read ? "bg-primary/5 border-l-2 border-l-primary" : "border-l-2 border-l-transparent"
                )}
              >
                <div className="mt-1 flex-shrink-0 bg-background p-2 rounded-full border border-border/50 shadow-sm">
                  {getIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn(
                      "text-sm font-semibold truncate",
                      !n.read ? "text-foreground" : "text-foreground/80"
                    )}>
                      {n.title}
                    </p>
                    <span className="text-[11px] text-muted-foreground flex-shrink-0 whitespace-nowrap">
                      {format(new Date(n.createdAt), "dd MMM, HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <p className={cn(
                    "text-sm mt-0.5 line-clamp-2",
                    !n.read ? "text-foreground/90 font-medium" : "text-muted-foreground"
                  )}>
                    {n.message}
                  </p>
                </div>
                <button
                  onClick={(e) => handleDelete(n.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-all flex-shrink-0"
                  title="Excluir notificação"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default NotificationsPage;
