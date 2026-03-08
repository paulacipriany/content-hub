import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/contexts/AppContext';
import ContentCard from '@/components/content/ContentCard';
import { STATUS_LABELS, WorkflowStatus, ContentWithRelations } from '@/data/types';
import { cn } from '@/lib/utils';
import { useClientFromUrl } from '@/hooks/useClientFromUrl';
import { useAuth } from '@/contexts/AuthContext';
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
} from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { useState } from 'react';

const statusOrder: WorkflowStatus[] = ['idea', 'production', 'review', 'approval-internal', 'approval-client', 'scheduled', 'published'];

const DraggableCard = ({ content }: { content: ContentWithRelations }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: content.id,
    data: { content },
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing">
      <ContentCard content={content} hideStatus />
    </div>
  );
};

const DroppableColumn = ({ status, children }: { status: WorkflowStatus; children: React.ReactNode }) => {
  const { isOver, setNodeRef } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-72 rounded-xl border-t-2 flex flex-col transition-colors",
        isOver && "ring-2 ring-inset"
      )}
      style={{
        backgroundColor: isOver ? 'var(--client-50, hsl(var(--secondary) / 0.5))' : 'hsl(var(--secondary) / 0.5)',
        borderTopColor: 'var(--client-500, hsl(var(--primary)))',
        ...(isOver ? { ringColor: 'var(--client-300)' } : {}),
      }}
    >
      {children}
    </div>
  );
};

const WorkflowPage = () => {
  useClientFromUrl();
  const { projectContents, updateContentStatus } = useApp();
  const { role } = useAuth();
  const isClient = role === 'client';
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const activeContent = activeId ? projectContents.find(c => c.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const contentId = active.id as string;
    const newStatus = over.id as WorkflowStatus;
    const content = projectContents.find(c => c.id === contentId);

    if (content && content.status !== newStatus) {
      updateContentStatus(contentId, newStatus);
    }
  };

  return (
    <>
      <TopBar title="Workflow" subtitle={isClient ? "Acompanhe o status dos seus conteúdos" : "Arraste os cards entre colunas para mudar o status"} />
      <div className="p-6 overflow-x-auto">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 min-w-max">
            {statusOrder.map(status => {
              const items = projectContents.filter(c => c.status === status);
              return (
                <DroppableColumn key={status} status={status}>
                  <div className="px-4 py-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">{STATUS_LABELS[status]}</span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: 'var(--client-100, hsl(var(--secondary)))', color: 'var(--client-700, hsl(var(--muted-foreground)))' }}
                    >
                      {items.length}
                    </span>
                  </div>
                  <div className="px-3 pb-3 space-y-2.5 flex-1 min-h-[100px]">
                    {items.map(item => (
                      <DraggableCard key={item.id} content={item} />
                    ))}
                    {items.length === 0 && (
                      <div className="text-center py-8 text-xs text-muted-foreground">
                        Nenhum conteúdo
                      </div>
                    )}
                  </div>
                </DroppableColumn>
              );
            })}
          </div>

          <DragOverlay>
            {activeContent ? (
              <div className="opacity-90 rotate-2 scale-105 shadow-xl">
                <ContentCard content={activeContent} hideStatus />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </>
  );
};

export default WorkflowPage;
