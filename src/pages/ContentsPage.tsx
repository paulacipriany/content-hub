import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/contexts/AppContext';
import ContentCard from '@/components/content/ContentCard';
import { useState } from 'react';
import { Platform, WorkflowStatus, PLATFORM_LABELS, STATUS_LABELS } from '@/data/types';

const ContentsPage = () => {
  const { contents } = useApp();
  const [filterPlatform, setFilterPlatform] = useState<Platform | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<WorkflowStatus | 'all'>('all');

  const filtered = contents.filter(c => {
    if (filterPlatform !== 'all' && c.platform !== filterPlatform) return false;
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    return true;
  });

  return (
    <>
      <TopBar title="Meus Conteúdos" subtitle="Todos os conteúdos em um só lugar" />
      <div className="p-6">
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <select
            value={filterPlatform}
            onChange={e => setFilterPlatform(e.target.value as Platform | 'all')}
            className="h-8 px-3 rounded-md bg-secondary text-sm text-foreground border-none outline-none cursor-pointer"
          >
            <option value="all">Todas plataformas</option>
            {Object.entries(PLATFORM_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as WorkflowStatus | 'all')}
            className="h-8 px-3 rounded-md bg-secondary text-sm text-foreground border-none outline-none cursor-pointer"
          >
            <option value="all">Todos os status</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground ml-auto">{filtered.length} conteúdos</span>
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
