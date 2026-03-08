import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/contexts/AppContext';
import ContentCard from '@/components/content/ContentCard';
import PostPreview from '@/components/content/PostPreview';
import { STATUS_LABELS, STATUS_COLORS, CONTENT_TYPE_LABELS, WorkflowStatus, ContentType, Platform, ContentWithRelations } from '@/data/types';
import { platformIcon } from '@/components/content/PlatformIcons';
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { X, Calendar, User } from 'lucide-react';

const statusOrder: WorkflowStatus[] = ['idea', 'production', 'review', 'approval-client', 'scheduled', 'published'];

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

const STATUS_CSS_VARS: Record<WorkflowStatus, string> = {
  'idea': '--status-idea',
  'idea-bank': '--status-idea',
  'production': '--status-production',
  'review': '--status-review',
  
  'approval-client': '--status-approval-client',
  'scheduled': '--status-scheduled',
  'published': '--status-published',
};

const DroppableColumn = ({ status, isEmpty, children }: { status: WorkflowStatus; isEmpty?: boolean; children: React.ReactNode }) => {
  const { isOver, setNodeRef } = useDroppable({ id: status });
  const cssVar = STATUS_CSS_VARS[status];

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-xl border-t-[3px] flex flex-col transition-all",
        isEmpty && !isOver ? "w-20 min-w-[5rem]" : "w-72",
        isOver && "ring-2 ring-inset"
      )}
      style={{
        backgroundColor: isOver ? `hsl(${`var(${cssVar})`} / 0.08)` : 'hsl(var(--secondary) / 0.5)',
        borderTopColor: `hsl(var(${cssVar}))`,
        ...(isOver ? { ringColor: `hsl(var(${cssVar}) / 0.3)` } : {}),
      }}
    >
      {children}
    </div>
  );
};

const WorkflowPage = () => {
  useClientFromUrl();
  const { projectContents, updateContentStatus, setSelectedContent } = useApp();
  const { role } = useAuth();
  const isClient = role === 'client';
  const [activeId, setActiveId] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<ContentWithRelations | null>(null);

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

  const handleClientCardClick = (content: ContentWithRelations) => {
    setPreviewContent(content);
  };

  const previewPlatform = previewContent?.platform
    ? (Array.isArray(previewContent.platform) ? previewContent.platform[0] : previewContent.platform)
    : null;

  return (
    <>
      <TopBar title="Workflow" subtitle={isClient ? "Acompanhe o status dos seus conteúdos" : "Arraste os cards entre colunas para mudar o status"} />
      <div className="p-6 overflow-x-auto">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 min-w-max">
            {statusOrder.map(status => {
              const items = projectContents.filter(c => c.status === status);
              return (
                <DroppableColumn key={status} status={status} isEmpty={items.length === 0}>
                  {items.length === 0 ? (
                    <div className="px-2 py-3 flex flex-col items-center gap-1">
                      <span className="text-[10px] font-semibold text-muted-foreground [writing-mode:vertical-lr] rotate-180 whitespace-nowrap">
                        {STATUS_LABELS[status]}
                      </span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: 'var(--client-100, hsl(var(--secondary)))', color: 'var(--client-700, hsl(var(--muted-foreground)))' }}
                      >
                        0
                      </span>
                    </div>
                  ) : (
                    <>
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
                          isClient
                            ? (
                              <div key={item.id}>
                                <ContentCard content={item} hideStatus readOnly onClick={() => handleClientCardClick(item)} />
                              </div>
                            )
                            : <DraggableCard key={item.id} content={item} />
                        ))}
                      </div>
                    </>
                  )}
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

      {/* Client preview sheet */}
      <Sheet open={!!previewContent} onOpenChange={(open) => { if (!open) setPreviewContent(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
          {previewContent && (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="px-6 pt-6 pb-4 border-b border-border">
                <SheetTitle className="text-lg font-semibold text-foreground mb-3">
                  {previewContent.title}
                </SheetTitle>
                <div className="flex flex-wrap gap-2">
                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-primary-foreground",
                    STATUS_COLORS[previewContent.status as WorkflowStatus]
                  )}>
                    {STATUS_LABELS[previewContent.status as WorkflowStatus]}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                    {CONTENT_TYPE_LABELS[previewContent.content_type as ContentType] || previewContent.content_type}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                    {platformIcon(previewContent.platform, 12)}
                    {Array.isArray(previewContent.platform)
                      ? previewContent.platform.join(', ')
                      : previewContent.platform}
                  </span>
                </div>
              </div>

              {/* Meta info */}
              <div className="px-6 py-3 border-b border-border/50 flex flex-wrap gap-4 text-xs text-muted-foreground">
                {previewContent.publish_date && (
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} />
                    <span>
                      {new Date(previewContent.publish_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      {previewContent.publish_time && ` às ${previewContent.publish_time}`}
                    </span>
                  </div>
                )}
                {previewContent.assignee_profile && (
                  <div className="flex items-center gap-1.5">
                    <User size={12} />
                    <span>{previewContent.assignee_profile.display_name}</span>
                  </div>
                )}
              </div>

              {/* Description */}
              {previewContent.description && (
                <div className="px-6 py-4 border-b border-border/50">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Descrição</h4>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{previewContent.description.replace(/<[^>]*>/g, '')}</p>
                </div>
              )}

              {/* Post Preview */}
              <div className="px-6 py-4 flex-1">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pré-visualização</h4>
                {previewPlatform ? (
                  <PostPreview content={previewContent} platform={previewPlatform as Platform} />
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Preview não disponível</p>
                )}
              </div>

              {/* Hashtags */}
              {previewContent.hashtags && previewContent.hashtags.length > 0 && (
                <div className="px-6 py-3 border-t border-border/50">
                  <div className="flex flex-wrap gap-1.5">
                    {previewContent.hashtags.map((tag, i) => (
                      <span key={i} className="text-xs text-primary font-medium">#{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default WorkflowPage;
