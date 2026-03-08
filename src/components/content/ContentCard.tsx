import { ContentWithRelations, STATUS_LABELS, STATUS_COLORS, CONTENT_TYPE_LABELS, WorkflowStatus, ContentType } from '@/data/types';
import { useApp } from '@/contexts/AppContext';
import { cn } from '@/lib/utils';
import { platformIcon } from './PlatformIcons';

interface ContentCardProps {
  content: ContentWithRelations;
  compact?: boolean;
}

const ContentCard = ({ content, compact }: ContentCardProps) => {
  const { setSelectedContent } = useApp();
  const assigneeName = content.assignee_profile?.display_name ?? 'Sem responsável';
  const initials = assigneeName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  if (compact) {
    return (
      <button
        onClick={() => setSelectedContent(content)}
        className="w-full text-left p-2 rounded-md bg-card border border-border hover:border-primary/30 hover:shadow-sm transition-all text-xs group"
      >
        <div className="flex items-center gap-1.5 mb-1">
          {platformIcon(content.platform, 12)}
          <span className="font-medium text-foreground truncate">{content.title}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_COLORS[content.status as WorkflowStatus])} />
          <span className="text-muted-foreground truncate">{STATUS_LABELS[content.status as WorkflowStatus]}</span>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={() => setSelectedContent(content)}
      className="w-full text-left p-3 rounded-lg bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {platformIcon(content.platform)}
          <span className="text-xs font-medium text-muted-foreground">{CONTENT_TYPE_LABELS[content.content_type as ContentType]}</span>
        </div>
        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-primary-foreground", STATUS_COLORS[content.status as WorkflowStatus])}>
          {STATUS_LABELS[content.status as WorkflowStatus]}
        </span>
      </div>
      <h3 className="text-sm font-medium text-foreground mb-1.5 group-hover:text-primary transition-colors">{content.title}</h3>
      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{content.description}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-[10px] font-medium text-primary">{initials}</span>
          </div>
          <span className="text-xs text-muted-foreground">{assigneeName.split(' ')[0]}</span>
        </div>
        {content.publish_date && (
          <span className="text-xs text-muted-foreground">
            {new Date(content.publish_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          </span>
        )}
      </div>
    </button>
  );
};

export default ContentCard;
