import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/contexts/AppContext';
import ContentCard from '@/components/content/ContentCard';
import PostPreview from '@/components/content/PostPreview';
import { STATUS_LABELS, STATUS_COLORS, CONTENT_TYPE_LABELS, WorkflowStatus, ContentType, Platform, ContentWithRelations } from '@/data/types';
import { platformIcon } from '@/components/content/PlatformIcons';
import { cn } from '@/lib/utils';
import { useClientFromUrl } from '@/hooks/useClientFromUrl';
import { useAuth } from '@/contexts/AuthContext';
import { Check, Copy, Download, Loader2 } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { X, Calendar, User } from 'lucide-react';
import { toast } from 'sonner';
import JSZip from 'jszip';

const statusOrder: WorkflowStatus[] = ['idea', 'production', 'review', 'approval-client', 'scheduled', 'programmed', 'published'];
const previewOnlyStatuses: WorkflowStatus[] = ['published', 'programmed', 'scheduled'];

const SortableCard = ({ content, onPreviewClick }: { content: ContentWithRelations; onPreviewClick?: (c: ContentWithRelations) => void }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: content.id,
    data: { content, type: 'Card' },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const isPreviewOnly = previewOnlyStatuses.includes(content.status as WorkflowStatus);

  return (
    <div ref={setNodeRef} style={style} className="outline-none">
      <ContentCard
        content={content}
        hideStatus
        readOnly={isPreviewOnly}
        onClick={isPreviewOnly && onPreviewClick ? () => onPreviewClick(content) : undefined}
        dragHandleProps={{ ...listeners, ...attributes }}
      />
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
  'programmed': '--status-programmed',
  'published': '--status-published',
};

const WorkflowPage = () => {
  useClientFromUrl();
  const { projectContents, updateContentStatus, updateContentFields } = useApp();
  const { role } = useAuth();
  const isClient = role === 'client';
  
  const [activeId, setActiveId] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<ContentWithRelations | null>(null);
  const [downloading, setDownloading] = useState(false);
  
  // Local state for items to handle reordering smoothly
  const [columns, setColumns] = useState<Record<WorkflowStatus, ContentWithRelations[]>>(() => {
    const initialState = {} as Record<WorkflowStatus, ContentWithRelations[]>;
    statusOrder.forEach(status => {
      initialState[status] = [];
    });
    return initialState;
  });

  // Sync internal state with projectContents when they change
  useEffect(() => {
    const newColumns = {} as Record<WorkflowStatus, ContentWithRelations[]>;
    statusOrder.forEach(status => {
      newColumns[status] = projectContents
        .filter(c => c.status === status)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    });
    setColumns(newColumns);
  }, [projectContents]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const activeContent = activeId ? projectContents.find(c => c.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeContainer = active.data.current?.content?.status;
    const overContainer = over.data.current?.content?.status || over.id; // Could be the column id

    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    setColumns(prev => {
      const activeItems = prev[activeContainer as WorkflowStatus] || [];
      const overItems = prev[overContainer as WorkflowStatus] || [];

      const activeIndex = activeItems.findIndex(i => i.id === activeId);
      const overIndex = overItems.findIndex(i => i.id === overId);

      let newIndex;
      if (overItems.some(i => i.id === overId)) {
        newIndex = overIndex >= 0 ? overIndex : overItems.length;
      } else {
        newIndex = overItems.length;
      }

      return {
        ...prev,
        [activeContainer as WorkflowStatus]: activeItems.filter(i => i.id !== activeId),
        [overContainer as WorkflowStatus]: [
          ...overItems.slice(0, newIndex),
          activeItems[activeIndex],
          ...overItems.slice(newIndex)
        ],
      };
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeContainer = active.data.current?.content?.status;
    const overContainer = over.data.current?.content?.status || over.id;

    if (!activeContainer || !overContainer) return;

    const activeItems = columns[activeContainer as WorkflowStatus];
    const overItems = columns[overContainer as WorkflowStatus];
    
    const activeIndex = activeItems.findIndex(i => i.id === activeId);
    const overIndex = overItems.findIndex(i => i.id === overId);

    if (activeContainer === overContainer) {
      if (activeIndex !== overIndex) {
        const reordered = arrayMove(activeItems, activeIndex, overIndex);
        setColumns(prev => ({ ...prev, [activeContainer as WorkflowStatus]: reordered }));
        
        // Save new order to database
        await savePositions(reordered, activeContainer as WorkflowStatus);
      }
    } else {
      // Container changed (handled in onDragOver for UI)
      // Save status change and position
      const targetItems = columns[overContainer as WorkflowStatus];
      const targetContent = targetItems.find(i => i.id === activeId);
      if (targetContent) {
        // Find adjacent items to calculate sort_order
        const itemIdx = targetItems.findIndex(i => i.id === activeId);
        const prevItem = targetItems[itemIdx - 1];
        const nextItem = targetItems[itemIdx + 1];
        
        let newSortOrder = 0;
        if (prevItem && nextItem) newSortOrder = (prevItem.sort_order! + nextItem.sort_order!) / 2;
        else if (prevItem) newSortOrder = prevItem.sort_order! + 1000;
        else if (nextItem) newSortOrder = nextItem.sort_order! - 1000;
        else newSortOrder = Date.now();

        await updateContentFields(activeId, { 
          status: overContainer,
          sort_order: newSortOrder
        });
      }
    }
  };

  const savePositions = async (items: ContentWithRelations[], status: WorkflowStatus) => {
    // Media-based sorting algorithm to avoid cascading updates
    // For now, simple re-assignment of sort_order for simplicity in this MVP
    // Better: use middle values (e.g. 1000, 2000, 3000)
    for (let i = 0; i < items.length; i++) {
      const newOrder = (i + 1) * 1000;
      if (items[i].sort_order !== newOrder) {
        await updateContentFields(items[i].id, { sort_order: newOrder });
      }
    }
  };

  const handleClientCardClick = (content: ContentWithRelations) => {
    setPreviewContent(content);
  };

  const handleDownloadZip = useCallback(async (content: ContentWithRelations) => {
    const urls: string[] = [];
    if (content.media_urls && Array.isArray(content.media_urls)) urls.push(...content.media_urls.filter(Boolean));
    if (content.media_url && !urls.includes(content.media_url)) urls.push(content.media_url);
    
    if (urls.length === 0) return;
    setDownloading(true);
    try {
      const zip = new JSZip();
      await Promise.all(urls.map(async (url, i) => {
        const res = await fetch(url);
        const blob = await res.blob();
        const ext = url.split('.').pop()?.split('?')[0] || 'jpg';
        zip.file(`${content.title.replace(/[^a-zA-Z0-9]/g, '_')}_${i + 1}.${ext}`, blob);
      }));
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(zipBlob);
      a.download = `${content.title.replace(/[^a-zA-Z0-9]/g, '_')}_midias.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      console.error('Erro ao baixar mídias:', e);
    } finally {
      setDownloading(false);
    }
  }, []);

  return (
    <>
      <TopBar title="Workflow" subtitle={isClient ? "Acompanhe o status dos seus conteúdos" : "Arraste os cards entre colunas para mudar o status"} />
      <div className="p-6 overflow-x-auto">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 min-w-max">
            {statusOrder.filter(status => !(isClient && status === 'idea')).map(status => {
              const items = columns[status] || [];
              const cssVar = STATUS_CSS_VARS[status];
              
              return (
                <div
                  key={status}
                  className={cn(
                    "rounded-xl flex flex-col transition-all min-h-[200px]",
                    items.length === 0 ? "w-20 min-w-[5rem]" : "w-72"
                  )}
                  style={{
                    backgroundColor: `hsl(var(${cssVar}) / 0.1)`,
                  }}
                >
                  <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                    {items.length === 0 ? (
                      <div className="px-2 py-4 flex flex-col items-center gap-2">
                        <span className="text-[10px] font-semibold text-muted-foreground [writing-mode:vertical-lr] rotate-180 whitespace-nowrap">
                          {STATUS_LABELS[status]}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-medium">(0)</span>
                      </div>
                    ) : (
                      <>
                        <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                          <span className="text-sm font-bold text-foreground">{STATUS_LABELS[status]}</span>
                          <span className="text-sm font-medium text-muted-foreground">({items.length})</span>
                        </div>
                        <div className="px-3 pb-3 space-y-2.5 flex-1">
                          {items.map(item => (
                            isClient
                              ? (
                                <div key={item.id}>
                                  <ContentCard content={item} hideStatus readOnly onClick={() => handleClientCardClick(item)} />
                                </div>
                              )
                              : <SortableCard key={item.id} content={item} onPreviewClick={handleClientCardClick} />
                          ))}
                        </div>
                      </>
                    )}
                  </SortableContext>
                </div>
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

      <Sheet open={!!previewContent} onOpenChange={(open) => { if (!open) setPreviewContent(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
          {previewContent && (
            <div className="flex flex-col h-full">
              <div className="px-6 pt-6 pb-4 border-b border-border">
                <SheetTitle className="text-lg font-semibold text-foreground mb-3">{previewContent.title}</SheetTitle>
                <div className="flex flex-wrap gap-2">
                  <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-primary-foreground", STATUS_COLORS[previewContent.status as WorkflowStatus])}>{STATUS_LABELS[previewContent.status as WorkflowStatus]}</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">{CONTENT_TYPE_LABELS[previewContent.content_type as ContentType] || previewContent.content_type}</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                    {platformIcon(previewContent.platform, 14, true)}
                  </span>
                </div>
              </div>

              <div className="px-6 py-3 border-b border-border/50 flex flex-wrap gap-4 text-xs text-muted-foreground">
                {previewContent.publish_date && (
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} />
                    <span>{new Date(previewContent.publish_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} {previewContent.publish_time && ` às ${previewContent.publish_time}`}</span>
                  </div>
                )}
                {previewContent.assignee_profile && (
                  <div className="flex items-center gap-1.5">
                    <User size={12} />
                    <span>{previewContent.assignee_profile.display_name}</span>
                  </div>
                )}
              </div>

              {previewContent.description && (
                <div className="px-6 py-4 border-b border-border/50">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Descrição</h4>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{previewContent.description.replace(/<[^>]*>/g, '')}</p>
                </div>
              )}

              <div className="px-6 py-4 flex-1">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pré-visualização</h4>
                {previewContent.platform && (Array.isArray(previewContent.platform) ? previewContent.platform[0] : previewContent.platform) ? (
                  <PostPreview content={previewContent} platform={(Array.isArray(previewContent.platform) ? previewContent.platform[0] : previewContent.platform) as Platform} compact={previewContent.status === 'programmed'} />
                ) : <p className="text-sm text-muted-foreground text-center py-8">Preview não disponível</p>}

                {previewContent.status === 'published' && (previewContent.copy_text || (previewContent.media_urls && previewContent.media_urls.length > 0)) && (
                  <div className="flex gap-2 mt-3 max-w-[350px] mx-auto">
                    {previewContent.copy_text && (
                      <Button variant="outline" size="sm" className="flex-1 gap-1.5 border-0" style={{ backgroundColor: '#c5daf7', color: '#1369db' }} onClick={() => { navigator.clipboard.writeText(previewContent.copy_text ?? ''); toast.success('Texto copiado!'); }}>
                        <Copy size={14} /> Copiar texto
                      </Button>
                    )}
                    {(previewContent.media_url || (previewContent.media_urls && previewContent.media_urls.length > 0)) && (
                      <Button variant="outline" size="sm" className="flex-1 gap-1.5 border-0" style={{ backgroundColor: '#c5daf7', color: '#1369db' }} disabled={downloading} onClick={() => handleDownloadZip(previewContent)}>
                        {downloading ? <><Loader2 size={14} className="animate-spin" /> Baixando...</> : <><Download size={14} /> Baixar mídias</>}
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {previewContent.hashtags && previewContent.hashtags.length > 0 && (
                <div className="px-6 py-3 border-t border-border/50">
                  <div className="flex flex-wrap gap-1.5">
                    {previewContent.hashtags.map((tag, i) => <span key={i} className="text-xs text-primary font-medium">#{tag}</span>)}
                  </div>
                </div>
              )}

              {previewContent.status === 'programmed' && !isClient && (
                <div className="px-6 py-3 border-t border-border/50">
                  <Button size="sm" className="w-full gap-1.5 font-semibold border-0" style={{ backgroundColor: '#ff88db', color: '#1a1a1a' }} onClick={() => { updateContentStatus(previewContent.id, 'published'); setPreviewContent(null); }}>
                    <Check size={14} /> Concluir
                  </Button>
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
