import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/contexts/AppContext';
import { STATUS_LABELS } from '@/data/types';
import { BarChart3, Clock, FileText } from 'lucide-react';
import { useClientFromUrl } from '@/hooks/useClientFromUrl';

const ReportsPage = () => {
  useClientFromUrl();
  const { projectContents } = useApp();

  const published = projectContents.filter(c => c.status === 'published').length;
  const inProgress = projectContents.filter(c => !['published', 'idea'].includes(c.status)).length;

  const byStatus = Object.entries(STATUS_LABELS).map(([key, label]) => ({
    status: key,
    label,
    count: projectContents.filter(c => c.status === key).length,
  }));

  const stats = [
    { label: 'Total de conteúdos', value: projectContents.length, icon: FileText },
    { label: 'Publicados', value: published, icon: BarChart3 },
    { label: 'Em andamento', value: inProgress, icon: Clock },
  ];

  return (
    <>
      <TopBar title="Relatórios" subtitle="Métricas de produtividade" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map(s => (
            <div
              key={s.label}
              className="rounded-xl p-5 border"
              style={{ backgroundColor: 'var(--client-50, hsl(var(--card)))', borderColor: 'var(--client-200, hsl(var(--border)))' }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center mb-2"
                style={{ backgroundColor: 'var(--client-200, hsl(var(--secondary)))' }}
              >
                <s.icon size={18} style={{ color: 'var(--client-700, hsl(var(--primary)))' }} />
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs" style={{ color: 'var(--client-600, hsl(var(--muted-foreground)))' }}>{s.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Distribuição por Status</h2>
          <div className="space-y-3">
            {byStatus.map(item => (
              <div key={item.status} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-32 flex-shrink-0">{item.label}</span>
                <div className="flex-1 h-6 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--client-100, hsl(var(--secondary)))' }}>
                  <div
                    className="h-full rounded-full transition-all flex items-center justify-end pr-2"
                    style={{
                      width: `${projectContents.length > 0 ? Math.max((item.count / projectContents.length) * 100, 8) : 0}%`,
                      backgroundColor: 'var(--client-500, hsl(var(--primary)))',
                    }}
                  >
                    <span className="text-[10px] font-medium" style={{ color: 'var(--client-50, hsl(var(--primary-foreground)))' }}>{item.count}</span>
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
