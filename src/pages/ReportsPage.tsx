import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/contexts/AppContext';
import { STATUS_LABELS, PLATFORM_LABELS, CONTENT_TYPE_LABELS, Platform, ContentType } from '@/data/types';
import { BarChart3, Clock, FileText, Layers, Share2 } from 'lucide-react';
import { useClientFromUrl } from '@/hooks/useClientFromUrl';

const ReportsPage = () => {
  useClientFromUrl();
  const { projectContents, selectedProject } = useApp();

  const published = projectContents.filter(c => c.status === 'published').length;
  const inProgress = projectContents.filter(c => !['published', 'idea'].includes(c.status)).length;
  const total = projectContents.length;

  const byStatus = Object.entries(STATUS_LABELS).map(([key, label]) => ({
    status: key,
    label,
    count: projectContents.filter(c => c.status === key).length,
  }));

  // Platform breakdown
  const clientPlatforms = ((selectedProject as any)?.platforms ?? ['instagram']) as Platform[];
  const byPlatform = clientPlatforms.map(p => ({
    platform: p,
    label: PLATFORM_LABELS[p],
    count: projectContents.filter(c => {
      const arr = Array.isArray(c.platform) ? c.platform : [c.platform];
      return arr.includes(p);
    }).length,
  })).filter(p => p.count > 0);

  // Content type breakdown
  const byType = Object.entries(CONTENT_TYPE_LABELS).map(([key, label]) => ({
    type: key,
    label,
    count: projectContents.filter(c => c.content_type === key).length,
  })).filter(t => t.count > 0);

  const stats = [
    { label: 'Total de conteúdos', value: total, icon: FileText },
    { label: 'Publicados', value: published, icon: BarChart3 },
    { label: 'Em andamento', value: inProgress, icon: Clock },
    { label: 'Tipos de post', value: byType.length, icon: Layers },
    { label: 'Redes sociais', value: byPlatform.length, icon: Share2 },
  ];

  return (
    <>
      <TopBar title="Relatórios" subtitle="Métricas de produtividade" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {stats.map(s => (
            <div
              key={s.label}
              className="rounded-xl p-4 border hover:shadow-sm transition-shadow"
              style={{ backgroundColor: 'var(--client-50, hsl(var(--card)))', borderColor: 'var(--client-200, hsl(var(--border)))' }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
                style={{ backgroundColor: 'var(--client-200, hsl(var(--secondary)))' }}
              >
                <s.icon size={16} style={{ color: 'var(--client-700, hsl(var(--primary)))' }} />
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--client-600, hsl(var(--muted-foreground)))' }}>{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status distribution */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Distribuição por Status</h2>
            <div className="space-y-2.5">
              {byStatus.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum conteúdo ainda.</p>
              ) : (
                byStatus.map(item => (
                  <div key={item.status} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-32 flex-shrink-0 truncate">{item.label}</span>
                    <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--client-100, hsl(var(--secondary)))' }}>
                      <div
                        className="h-full rounded-full transition-all flex items-center justify-end pr-2"
                        style={{
                          width: `${total > 0 ? Math.max((item.count / total) * 100, 12) : 0}%`,
                          backgroundColor: 'var(--client-500, hsl(var(--primary)))',
                        }}
                      >
                        <span className="text-[10px] font-medium" style={{ color: 'var(--client-500-contrast, hsl(var(--primary-foreground)))' }}>{item.count}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Platform breakdown */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Conteúdos por Rede Social</h2>
            <div className="space-y-2.5">
              {byPlatform.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum conteúdo ainda.</p>
              ) : (
                byPlatform.map(item => (
                  <div key={item.platform} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-32 flex-shrink-0 truncate">{item.label}</span>
                    <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--client-100, hsl(var(--secondary)))' }}>
                      <div
                        className="h-full rounded-full transition-all flex items-center justify-end pr-2"
                        style={{
                          width: `${total > 0 ? Math.max((item.count / total) * 100, 12) : 0}%`,
                          backgroundColor: 'var(--client-300, hsl(var(--primary)))',
                        }}
                      >
                        <span className="text-[10px] font-medium" style={{ color: 'var(--client-900, hsl(var(--primary-foreground)))' }}>{item.count}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Content type breakdown */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Conteúdos por Tipo de Post</h2>
            <div className="space-y-2.5">
              {byType.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum conteúdo ainda.</p>
              ) : (
                byType.map(item => (
                  <div key={item.type} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-32 flex-shrink-0 truncate">{item.label}</span>
                    <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--client-100, hsl(var(--secondary)))' }}>
                      <div
                        className="h-full rounded-full transition-all flex items-center justify-end pr-2"
                        style={{
                          width: `${total > 0 ? Math.max((item.count / total) * 100, 12) : 0}%`,
                          backgroundColor: 'var(--client-400, hsl(var(--primary)))',
                        }}
                      >
                        <span className="text-[10px] font-medium" style={{ color: 'var(--client-50, hsl(var(--primary-foreground)))' }}>{item.count}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ReportsPage;
