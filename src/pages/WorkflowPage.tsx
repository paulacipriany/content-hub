import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/contexts/AppContext';
import ContentCard from '@/components/content/ContentCard';
import { STATUS_LABELS, WorkflowStatus } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const statusOrder: WorkflowStatus[] = ['idea', 'production', 'review', 'approval-internal', 'approval-client', 'scheduled', 'published'];

const columnColors: Record<WorkflowStatus, string> = {
  'idea': 'border-t-status-idea',
  'production': 'border-t-status-production',
  'review': 'border-t-status-review',
  'approval-internal': 'border-t-status-approval',
  'approval-client': 'border-t-status-approval',
  'scheduled': 'border-t-status-scheduled',
  'published': 'border-t-status-published',
};

const WorkflowPage = () => {
  const { contents } = useApp();

  return (
    <>
      <TopBar title="Workflow" subtitle="Gerencie o fluxo de aprovação dos conteúdos" />
      <div className="p-6 overflow-x-auto">
        <div className="flex gap-4 min-w-max">
          {statusOrder.map(status => {
            const items = contents.filter(c => c.status === status);
            return (
              <div key={status} className={cn("w-72 bg-secondary/50 rounded-xl border-t-2 flex flex-col", columnColors[status])}>
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">{STATUS_LABELS[status]}</span>
                  <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">{items.length}</span>
                </div>
                <div className="px-3 pb-3 space-y-2.5 flex-1">
                  {items.map(item => (
                    <ContentCard key={item.id} content={item} />
                  ))}
                  {items.length === 0 && (
                    <div className="text-center py-8 text-xs text-muted-foreground">
                      Nenhum conteúdo
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default WorkflowPage;
