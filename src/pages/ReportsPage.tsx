import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/contexts/AppContext';
import { STATUS_LABELS, WorkflowStatus } from '@/data/types';
import { BarChart3, Clock, FileText } from 'lucide-react';
import { useClientFromUrl } from '@/hooks/useClientFromUrl';

const ReportsPage = () => {
  useClientFromUrl();
  const { projectContents, selectedProject } = useApp();

  const published = projectContents.filter(c => c.status === 'published').length;
  const inProgress = projectContents.filter(c => !['published', 'idea'].includes(c.status)).length;

  const byStatus = Object.entries(STATUS_LABELS).map(([key, label]) => ({
    status: key,
    label,
    count: projectContents.filter(c => c.status === key).length,
  }));

  return (
    <>
      <TopBar title="Relatórios" subtitle="Métricas de produtividade" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <FileText size={20} className="text-primary mb-2" />
            <p className="text-2xl font-bold text-foreground">{projectContents.length}</p>
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

        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Distribuição por Status</h2>
          <div className="space-y-3">
            {byStatus.map(item => (
              <div key={item.status} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-32 flex-shrink-0">{item.label}</span>
                <div className="flex-1 h-6 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all flex items-center justify-end pr-2"
                    style={{ width: `${projectContents.length > 0 ? Math.max((item.count / projectContents.length) * 100, 8) : 0}%` }}
                  >
                    <span className="text-[10px] font-medium text-primary-foreground">{item.count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default ReportsPage;
