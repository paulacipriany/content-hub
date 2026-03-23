import TopBar from '@/components/layout/TopBar';
import RemindersCard from '@/components/dashboard/RemindersCard';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { STATUS_LABELS, WorkflowStatus } from '@/data/types';
import { cn } from '@/lib/utils';
import { FileText, CheckCircle, Clock, AlertTriangle, TrendingUp, Wrench, CalendarClock, Radio, ArrowRight, Eye, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { contents, projects, setSelectedProject, pendingUsersCount } = useApp();
  const { role } = useAuth();
  const navigate = useNavigate();

  const published = contents.filter(c => c.status === 'published').length;
  const inApproval = contents.filter(c => c.status === 'approval-client').length;
  const inReview = contents.filter(c => c.status === 'review').length;
  const inProduction = contents.filter(c => c.status === 'production').length;
  const scheduled = contents.filter(c => c.status === 'scheduled').length;
  const programmed = contents.filter(c => c.status === 'programmed').length;

  const stats = [
    { label: 'Total de Conteúdos', value: contents.length, icon: FileText, color: 'text-primary' },
    { label: 'Publicados', value: published, icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Programados', value: programmed, icon: Radio, color: 'text-purple-600 dark:text-purple-400' },
    { label: 'Agendados', value: scheduled, icon: CalendarClock, color: 'text-blue-600 dark:text-blue-400' },
    { label: 'Em Aprovação', value: inApproval, icon: Clock, color: 'text-red-600 dark:text-red-400' },
    { label: 'Em Produção', value: inProduction, icon: TrendingUp, color: 'text-orange-600 dark:text-orange-400' },
  ];

  const pendingApprovals = contents.filter(c => c.status === 'approval-client');
  const reviewContents = contents.filter(c => c.status === 'review');
  const productionContents = contents.filter(c => c.status === 'production');

  const handleProjectClick = (project: typeof projects[number]) => {
    setSelectedProject(project);
    navigate(`/clients/${project.id}/dashboard`);
  };

  // Recent sorted by updated_at
  const recent = [...contents].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 6);

  const isAdminOrModerator = role === 'admin' || role === 'moderator';

  return (
    <>
      <TopBar title="Dashboard" subtitle="Visão geral do SocialFlow" />
      <div className="p-6 space-y-6">
        {/* Pending Users Alert */}
        {isAdminOrModerator && pendingUsersCount > 0 && (
          <button
            onClick={() => navigate('/users')}
            className="w-full flex items-center justify-between gap-3 px-4 py-4 rounded-xl border bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900 transition-all hover:shadow-md hover:brightness-105 active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0">
                <UserPlus size={20} />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Novos usuários aguardando aprovação
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  Existem {pendingUsersCount} {pendingUsersCount === 1 ? 'usuário pendente' : 'usuários pendentes'} que precisa{pendingUsersCount === 1 ? '' : 'm'} de aprovação para acessar a plataforma.
                </p>
              </div>
            </div>
            <ArrowRight size={18} className="text-amber-600 dark:text-amber-400" />
          </button>
        )}

        {/* Alert banners */}
        <div className="flex flex-col gap-3">
          {inApproval > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-red-50 border-red-200 dark:bg-red-950/50 dark:border-red-800">
              <AlertTriangle size={18} className="text-red-700 dark:text-red-400" />
              <span className="text-sm font-medium text-red-700 dark:text-red-400">
                {inApproval} conteúdo{inApproval > 1 ? 's' : ''} em aprovação
              </span>
            </div>
          )}
          {inReview > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-orange-50 border-orange-200 dark:bg-orange-950/50 dark:border-orange-800">
              <Eye size={18} className="text-orange-700 dark:text-orange-400" />
              <span className="text-sm font-medium text-orange-700 dark:text-orange-400">
                {inReview} conteúdo{inReview > 1 ? 's' : ''} em revisão
              </span>
            </div>
          )}
          {scheduled > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-blue-50 border-blue-200 dark:bg-blue-950/50 dark:border-blue-800">
              <CalendarClock size={18} className="text-blue-700 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                {scheduled} post{scheduled > 1 ? 's' : ''} pronto{scheduled > 1 ? 's' : ''} para agendar
              </span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
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

        {/* Reminders */}
        <RemindersCard />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Projects */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Projetos</h2>
            <div className="space-y-2.5">
              {projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum projeto ainda. Crie seu primeiro projeto!</p>
              ) : (
                projects.map(p => {
                  const pContents = contents.filter(c => c.project_id === p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleProjectClick(p)}
                      className="w-full p-3 rounded-lg hover:bg-secondary transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        {(p as any).logo_url ? (
                          <img src={(p as any).logo_url} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                        )}
                        <span className="text-sm font-medium text-foreground">{p.name}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{pContents.length}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* In Review */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Eye size={16} className="text-orange-600 dark:text-orange-400" />
              <h2 className="text-sm font-semibold text-foreground">Em Revisão</h2>
              <span className="ml-auto text-xs font-semibold text-muted-foreground">{reviewContents.length}</span>
            </div>
            <div className="space-y-2.5">
              {reviewContents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum conteúdo em revisão.</p>
              ) : (
                reviewContents.slice(0, 5).map(c => {
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
              <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />
              <h2 className="text-sm font-semibold text-foreground">Aguardando Aprovação</h2>
              <span className="ml-auto text-xs font-semibold text-muted-foreground">{pendingApprovals.length}</span>
            </div>
            <div className="space-y-2.5">
              {pendingApprovals.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum conteúdo pendente.</p>
              ) : (
                pendingApprovals.slice(0, 5).map(c => {
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
        </div>

        {/* Recent Activity */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Atividade Recente</h2>
          <div className="space-y-3">
            {contents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma atividade ainda.</p>
            ) : (
              recent.map(c => (
                <div key={c.id} className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                  <span className="text-foreground font-medium truncate flex-1">{c.title}</span>
                  <span className="text-muted-foreground text-xs flex-shrink-0">{STATUS_LABELS[c.status as WorkflowStatus]}</span>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">{new Date(c.updated_at).toLocaleDateString('pt-BR')}</span>
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
