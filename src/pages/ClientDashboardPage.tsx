import TopBar from '@/components/layout/TopBar';
import TaskListCard from '@/components/dashboard/TaskListCard';
import { useApp } from '@/contexts/AppContext';
import { useClientFromUrl } from '@/hooks/useClientFromUrl';
import { STATUS_LABELS, WorkflowStatus, PLATFORM_LABELS, Platform } from '@/data/types';
import {
  FileText, Calendar, GitBranch, CheckCircle, Image, BarChart3,
  TrendingUp, Clock, ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const ClientDashboardPage = () => {
  useClientFromUrl();
  const { projectContents, selectedProject } = useApp();
  const navigate = useNavigate();

  if (!selectedProject) return null;

  const basePath = `/clients/${selectedProject.id}`;

  const total = projectContents.length;
  const published = projectContents.filter(c => c.status === 'published').length;
  const inApproval = projectContents.filter(c => c.status.startsWith('approval')).length;
  const inProduction = projectContents.filter(c => c.status === 'production').length;
  const scheduled = projectContents.filter(c => c.status === 'scheduled').length;

  const stats = [
    { label: 'Total', value: total, icon: FileText, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Publicados', value: published, icon: CheckCircle, color: 'text-status-published', bg: 'bg-status-published/10' },
    { label: 'Em Aprovação', value: inApproval, icon: Clock, color: 'text-status-approval', bg: 'bg-status-approval/10' },
    { label: 'Em Produção', value: inProduction, icon: TrendingUp, color: 'text-status-production', bg: 'bg-status-production/10' },
  ];

  // Platform breakdown
  const clientPlatforms = ((selectedProject as any).platforms ?? ['instagram']) as Platform[];
  const platforms = clientPlatforms.map(p => ({
    platform: p,
    label: PLATFORM_LABELS[p],
    count: projectContents.filter(c => {
      const arr = Array.isArray(c.platform) ? c.platform : [c.platform];
      return arr.includes(p);
    }).length,
  })).filter(p => p.count > 0);

  // Status breakdown
  const byStatus = Object.entries(STATUS_LABELS).map(([key, label]) => ({
    status: key,
    label,
    count: projectContents.filter(c => c.status === key).length,
  })).filter(s => s.count > 0);

  // Recent contents
  const recent = projectContents.slice(0, 5);

  // Quick access sections
  const sections = [
    { icon: FileText, label: 'Conteúdos', path: '/contents', desc: `${total} conteúdos`, color: 'text-primary' },
    { icon: Calendar, label: 'Calendário', path: '/calendar', desc: 'Planejamento mensal', color: 'text-status-scheduled' },
    { icon: GitBranch, label: 'Workflow', path: '/workflow', desc: 'Quadro kanban', color: 'text-status-production' },
    { icon: CheckCircle, label: 'Aprovações', path: '/approvals', desc: `${inApproval} pendentes`, color: 'text-status-approval' },
    { icon: Image, label: 'Biblioteca', path: '/media', desc: 'Mídia e templates', color: 'text-accent-foreground' },
    { icon: BarChart3, label: 'Relatórios', path: '/reports', desc: 'Métricas', color: 'text-status-published' },
  ];

  return (
    <>
      <TopBar title="Dashboard" subtitle={selectedProject.name} />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4 hover:shadow-sm transition-shadow">
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center mb-3", s.bg)}>
                <s.icon size={18} className={s.color} />
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Quick access */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Acesso Rápido</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {sections.map(s => (
              <button
                key={s.path}
                onClick={() => navigate(`${basePath}${s.path}`)}
                className="bg-card border border-border rounded-xl p-4 text-left hover:shadow-md hover:border-primary/20 transition-all group"
              >
                <s.icon size={20} className={cn(s.color, "mb-2")} />
                <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{s.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{s.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Task list */}
          <TaskListCard projectId={selectedProject.id} />
          {/* Status distribution */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Distribuição por Status</h2>
            <div className="space-y-2.5">
              {byStatus.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum conteúdo ainda.</p>
              ) : (
                byStatus.map(item => (
                  <div key={item.status} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-28 flex-shrink-0 truncate">{item.label}</span>
                    <div className="flex-1 h-5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all flex items-center justify-end pr-2"
                        style={{ width: `${total > 0 ? Math.max((item.count / total) * 100, 12) : 0}%` }}
                      >
                        <span className="text-[10px] font-medium text-primary-foreground">{item.count}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Platform breakdown */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Conteúdos por Plataforma</h2>
            <div className="space-y-2.5">
              {platforms.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum conteúdo ainda.</p>
              ) : (
                platforms.map(item => (
                  <div key={item.platform} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-28 flex-shrink-0">{item.label}</span>
                    <div className="flex-1 h-5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full transition-all flex items-center justify-end pr-2"
                        style={{ width: `${total > 0 ? Math.max((item.count / total) * 100, 12) : 0}%` }}
                      >
                        <span className="text-[10px] font-medium text-foreground">{item.count}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Atividade Recente</h2>
            <button
              onClick={() => navigate(`${basePath}/contents`)}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              Ver todos <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-3">
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum conteúdo ainda.</p>
            ) : (
              recent.map(c => (
                <div key={c.id} className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                  <span className="text-foreground font-medium truncate">{c.title}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-muted-foreground text-xs">{STATUS_LABELS[c.status as WorkflowStatus]}</span>
                  <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
                    {new Date(c.updated_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ClientDashboardPage;
