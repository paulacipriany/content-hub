import TopBar from '@/components/layout/TopBar';
import RemindersCard from '@/components/dashboard/RemindersCard';
import { useApp } from '@/contexts/AppContext';
import { STATUS_LABELS, STATUS_COLORS, WorkflowStatus } from '@/data/types';
import { cn } from '@/lib/utils';
import { FileText, CheckCircle, Clock, AlertTriangle, TrendingUp, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { contents, projects, setSelectedProject } = useApp();
  const navigate = useNavigate();

  const stats = [
    { label: 'Total de Conteúdos', value: contents.length, icon: FileText, color: 'text-primary' },
    { label: 'Publicados', value: contents.filter(c => c.status === 'published').length, icon: CheckCircle, color: 'text-status-published' },
    { label: 'Em Aprovação', value: contents.filter(c => c.status.startsWith('approval')).length, icon: Clock, color: 'text-status-approval' },
    { label: 'Em Produção', value: contents.filter(c => c.status === 'production').length, icon: TrendingUp, color: 'text-status-production' },
  ];

  const pendingApprovals = contents.filter(c => c.status === 'approval-client');
  const inProduction = contents.filter(c => c.status === 'production');

  const handleClientClick = (project: typeof projects[number]) => {
    setSelectedProject(project);
    navigate(`/clients/${project.id}/dashboard`);
  };

  return (
    <>
      <TopBar title="Dashboard" subtitle="Visão geral do SocialFlow" />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <s.icon size={20} className={s.color} />
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Reminders — full width */}
        <RemindersCard />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Clients */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Clientes</h2>
            <div className="space-y-2.5">
              {projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum cliente ainda. Crie seu primeiro cliente!</p>
              ) : (
                projects.map(p => {
                  const pContents = contents.filter(c => c.project_id === p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleClientClick(p)}
                      className="w-full p-3 rounded-lg hover:bg-secondary transition-colors text-left"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-3">
                          {(p as any).logo_url ? (
                            <img src={(p as any).logo_url} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                          )}
                          <span className="text-sm font-medium text-foreground">{p.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{pContents.length}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(['idea', 'production', 'review', 'approval-client', 'scheduled', 'published'] as WorkflowStatus[]).map(s => {
                          const count = pContents.filter(c => c.status === s).length;
                          if (count === 0) return null;
                          return (
                            <span key={s} className={cn("px-1.5 py-0.5 rounded-full text-[9px] font-semibold text-primary-foreground", STATUS_COLORS[s])}>
                              {count}
                            </span>
                          );
                        })}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* In Production */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Wrench size={16} className="text-status-production" />
              <h2 className="text-sm font-semibold text-foreground">Em Produção</h2>
              <span className="ml-auto text-xs font-semibold text-muted-foreground">{inProduction.length}</span>
            </div>
            <div className="space-y-2.5">
              {inProduction.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum conteúdo em produção.</p>
              ) : (
                inProduction.map(c => {
                  const project = projects.find(p => p.id === c.project_id);
                  return (
                    <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{project?.name ?? ''}</p>
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                        {c.assignee_profile?.display_name?.split(' ')[0] ?? ''}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Pending Approvals */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={16} className="text-status-approval" />
              <h2 className="text-sm font-semibold text-foreground">Aguardando Aprovação</h2>
              <span className="ml-auto text-xs font-semibold text-muted-foreground">{pendingApprovals.length}</span>
            </div>
            <div className="space-y-2.5">
              {pendingApprovals.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum conteúdo pendente.</p>
              ) : (
                pendingApprovals.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.title}</p>
                      <p className="text-xs text-muted-foreground">{STATUS_LABELS[c.status as WorkflowStatus]}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{c.assignee_profile?.display_name?.split(' ')[0] ?? ''}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Atividade Recente</h2>
          <div className="space-y-3">
            {contents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma atividade ainda.</p>
            ) : (
              contents.slice(0, 5).map(c => (
                <div key={c.id} className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                  <span className="text-foreground font-medium">{c.title}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-muted-foreground">{STATUS_LABELS[c.status as WorkflowStatus]}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{new Date(c.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
