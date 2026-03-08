import { X, MessageSquare, CheckSquare, Hash, Calendar as CalIcon, User, Send } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { STATUS_LABELS, STATUS_COLORS, PLATFORM_LABELS, CONTENT_TYPE_LABELS, WorkflowStatus } from '@/data/mockData';
import { platformIcon } from './ContentCard';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

const allStatuses: WorkflowStatus[] = ['idea', 'production', 'review', 'approval-internal', 'approval-client', 'scheduled', 'published'];

const ContentPanel = () => {
  const { selectedContent, setSelectedContent, updateContentStatus } = useApp();
  const [newComment, setNewComment] = useState('');

  if (!selectedContent) return null;

  const currentIdx = allStatuses.indexOf(selectedContent.status);
  const canAdvance = currentIdx < allStatuses.length - 1;

  return (
    <div className="w-[420px] border-l border-border bg-card flex flex-col h-full animate-slide-in-right flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-5 h-14 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          {platformIcon(selectedContent.platform, 16)}
          <span className="font-semibold text-sm text-foreground">{selectedContent.title}</span>
        </div>
        <button onClick={() => setSelectedContent(null)} className="text-muted-foreground hover:text-foreground transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-5">
        {/* Status */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Status</label>
          <div className="flex flex-wrap gap-1.5">
            {allStatuses.map(s => (
              <button
                key={s}
                onClick={() => updateContentStatus(selectedContent.id, s)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                  selectedContent.status === s
                    ? cn(STATUS_COLORS[s], "text-primary-foreground")
                    : "bg-secondary text-muted-foreground hover:bg-accent"
                )}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <CalIcon size={14} className="text-muted-foreground" />
            <span className="text-muted-foreground">Publicação:</span>
            <span className="text-foreground">{new Date(selectedContent.publishDate).toLocaleDateString('pt-BR')}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <User size={14} className="text-muted-foreground" />
            <span className="text-muted-foreground">Responsável:</span>
            <span className="text-foreground">{selectedContent.assignee.name}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground ml-[26px]">Plataforma:</span>
            <span className="text-foreground">{PLATFORM_LABELS[selectedContent.platform]}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground ml-[26px]">Tipo:</span>
            <span className="text-foreground">{CONTENT_TYPE_LABELS[selectedContent.contentType]}</span>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Descrição / Copy</label>
          <p className="text-sm text-foreground bg-secondary rounded-lg p-3">{selectedContent.description}</p>
        </div>

        {/* Hashtags */}
        {selectedContent.hashtags.length > 0 && (
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><Hash size={12} />Hashtags</label>
            <div className="flex flex-wrap gap-1.5">
              {selectedContent.hashtags.map(h => (
                <span key={h} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">{h}</span>
              ))}
            </div>
          </div>
        )}

        {/* Checklist */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><CheckSquare size={12} />Checklist</label>
          <div className="space-y-1.5">
            {selectedContent.checklist.map(item => (
              <div key={item.id} className="flex items-center gap-2.5 text-sm">
                <div className={cn("w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0",
                  item.done ? "bg-status-published border-status-published" : "border-border"
                )}>
                  {item.done && <span className="text-primary-foreground text-[10px]">✓</span>}
                </div>
                <span className={cn(item.done && "line-through text-muted-foreground")}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Comments */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><MessageSquare size={12} />Comentários</label>
          <div className="space-y-2.5">
            {selectedContent.comments.map(c => (
              <div key={c.id} className="bg-secondary rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-foreground">{c.userName}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(c.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
                <p className="text-xs text-muted-foreground">{c.text}</p>
              </div>
            ))}
            {selectedContent.comments.length === 0 && (
              <p className="text-xs text-muted-foreground italic">Nenhum comentário ainda.</p>
            )}
          </div>

          {/* Add comment */}
          <div className="flex gap-2 mt-3">
            <input
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Adicionar comentário..."
              className="flex-1 h-8 px-3 rounded-md bg-secondary text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/20"
            />
            <button className="w-8 h-8 rounded-md bg-primary flex items-center justify-center hover:opacity-90 transition-opacity">
              <Send size={14} className="text-primary-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* Footer actions */}
      {canAdvance && (
        <div className="p-4 border-t border-border flex-shrink-0">
          <Button
            className="w-full"
            onClick={() => updateContentStatus(selectedContent.id, allStatuses[currentIdx + 1])}
          >
            Avançar para {STATUS_LABELS[allStatuses[currentIdx + 1]]}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ContentPanel;
