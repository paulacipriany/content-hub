import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/contexts/AppContext';
import ContentCard from '@/components/content/ContentCard';
import { useState } from 'react';
import { Platform, WorkflowStatus, PLATFORM_LABELS, STATUS_LABELS } from '@/data/types';
import { useClientFromUrl } from '@/hooks/useClientFromUrl';

const ContentsPage = () => {
  useClientFromUrl();
  const { projectContents, loading, selectedProject } = useApp();
  const [filterPlatform, setFilterPlatform] = useState<Platform | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<WorkflowStatus | 'all'>('all');

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground animate-pulse">Carregando conteúdos...</p>
      </div>
    );
  }

  if (!selectedProject) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <h2 className="text-lg font-semibold text-foreground mb-2">Projeto não encontrado</h2>
        <p className="text-sm text-muted-foreground mb-6">Não foi possível carregar os conteúdos deste projeto.</p>
      </div>
    );
  }

  const filtered = projectContents.filter(c => {
    if (filterPlatform !== 'all') {
      const platforms = Array.isArray(c.platform) ? c.platform : [c.platform];
      if (!platforms.includes(filterPlatform)) return false;
    }
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    return true;
  });

  return (
    <>
      <TopBar title="Conteúdos" subtitle="Todos os conteúdos deste cliente" />
      <div className="p-6">
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <select
            value={filterPlatform}
            onChange={e => setFilterPlatform(e.target.value as Platform | 'all')}
            className="h-8 px-3 rounded-md text-sm text-foreground border-none outline-none cursor-pointer"
            style={{ backgroundColor: 'var(--client-50, hsl(var(--secondary)))' }}
          >
            <option value="all">Todas plataformas</option>
            {Object.entries(PLATFORM_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as WorkflowStatus | 'all')}
            className="h-8 px-3 rounded-md text-sm text-foreground border-none outline-none cursor-pointer"
            style={{ backgroundColor: 'var(--client-50, hsl(var(--secondary)))' }}
          >
            <option value="all">Todos os status</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <span className="text-xs ml-auto" style={{ color: 'var(--client-600, hsl(var(--muted-foreground)))' }}>{filtered.length} conteúdos</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(c => (
            <ContentCard key={c.id} content={c} />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-20 text-muted-foreground">
              <p className="text-sm">Nenhum conteúdo encontrado.</p>
              <p className="text-xs mt-1">Crie seu primeiro conteúdo para começar!</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ContentsPage;
