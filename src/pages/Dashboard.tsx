import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/contexts/AppContext';
import { STATUS_LABELS, WorkflowStatus } from '@/data/types';
import { FileText, CheckCircle, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { contents, projects } = useApp();
  const navigate = useNavigate();

  const stats = [
    { label: 'Total de Conteúdos', value: contents.length, icon: FileText, color: 'text-primary' },
    { label: 'Publicados', value: contents.filter(c => c.status === 'published').length, icon: CheckCircle, color: 'text-status-published' },
    { label: 'Em Aprovação', value: contents.filter(c => c.status.startsWith('approval')).length, icon: Clock, color: 'text-status-approval' },
    { label: 'Em Produção', value: contents.filter(c => c.status === 'production').length, icon: TrendingUp, color: 'text-status-production' },
  ];

  const pendingApprovals = contents.filter(c => c.status === 'approval-internal' || c.status === 'approval-client');

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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Projects */}
          <div className="bg-card border border-border rounded-xl p-5">
             <h2 className="text-sm font-semibold text-foreground mb-4">Clientes</h2>
            <div className="space-y-2.5">
              {projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum cliente ainda. Crie seu primeiro cliente!</p>
              ) : (
                projects.map(p => {
                  const count = contents.filter(c => c.project_id === p.id).length;
                  return (
                    <button
                      key={p.id}
                      onClick={() => navigate(`/projects/${p.id}`)}
                      className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-secondary transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="text-sm font-medium text-foreground">{p.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{count} conteúdos</span>
                    </button>
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
