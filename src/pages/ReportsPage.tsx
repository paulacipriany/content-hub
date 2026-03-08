import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/contexts/AppContext';
import { mockProjects, STATUS_LABELS } from '@/data/mockData';
import { BarChart3, Clock, Users, FileText } from 'lucide-react';

const ReportsPage = () => {
  const { contents } = useApp();

  const published = contents.filter(c => c.status === 'published').length;
  const inProgress = contents.filter(c => !['published', 'idea'].includes(c.status)).length;

  const byStatus = Object.entries(STATUS_LABELS).map(([key, label]) => ({
    status: key,
    label,
    count: contents.filter(c => c.status === key).length,
  }));

  return (
    <>
      <TopBar title="Relatórios" subtitle="Métricas de produtividade" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <FileText size={20} className="text-primary mb-2" />
            <p className="text-2xl font-bold text-foreground">{contents.length}</p>
            <p className="text-xs text-muted-foreground">Total de conteúdos</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <BarChart3 size={20} className="text-status-published mb-2" />
            <p className="text-2xl font-bold text-foreground">{published}</p>
            <p className="text-xs text-muted-foreground">Publicados</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <Clock size={20} className="text-status-production mb-2" />
            <p className="text-2xl font-bold text-foreground">{inProgress}</p>
            <p className="text-xs text-muted-foreground">Em andamento</p>
          </div>
        </div>

        {/* Status distribution */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Distribuição por Status</h2>
          <div className="space-y-3">
            {byStatus.map(item => (
              <div key={item.status} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-32 flex-shrink-0">{item.label}</span>
                <div className="flex-1 h-6 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all flex items-center justify-end pr-2"
                    style={{ width: `${contents.length > 0 ? Math.max((item.count / contents.length) * 100, 8) : 0}%` }}
                  >
                    <span className="text-[10px] font-medium text-primary-foreground">{item.count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By project */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Conteúdos por Projeto</h2>
          <div className="space-y-3">
            {mockProjects.map(p => {
              const count = contents.filter(c => c.projectId === p.id).length;
              return (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                  <span className="text-sm text-foreground flex-shrink-0 w-40">{p.name}</span>
                  <div className="flex-1 h-6 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all flex items-center justify-end pr-2"
                      style={{ width: `${contents.length > 0 ? Math.max((count / contents.length) * 100, 8) : 0}%`, backgroundColor: p.color }}
                    >
                      <span className="text-[10px] font-medium text-primary-foreground">{count}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default ReportsPage;
