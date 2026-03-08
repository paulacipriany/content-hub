import { ContentItem, STATUS_LABELS, STATUS_COLORS, PLATFORM_LABELS, CONTENT_TYPE_LABELS } from '@/data/mockData';
import { useApp } from '@/contexts/AppContext';
import { cn } from '@/lib/utils';
import { Instagram, Facebook, Linkedin, Youtube } from 'lucide-react';

const platformIcon = (platform: string, size = 14) => {
  switch (platform) {
    case 'instagram': return <Instagram size={size} className="text-platform-instagram" />;
    case 'facebook': return <Facebook size={size} className="text-platform-facebook" />;
    case 'linkedin': return <Linkedin size={size} className="text-platform-linkedin" />;
    case 'youtube': return <Youtube size={size} className="text-platform-youtube" />;
    case 'tiktok': return <span className="text-xs font-bold" style={{ fontSize: size - 2 }}>TT</span>;
    default: return null;
  }
};

interface ContentCardProps {
  content: ContentItem;
  compact?: boolean;
}

const ContentCard = ({ content, compact }: ContentCardProps) => {
  const { setSelectedContent } = useApp();

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
          <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_COLORS[content.status])} />
          <span className="text-muted-foreground truncate">{STATUS_LABELS[content.status]}</span>
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
          <span className="text-xs font-medium text-muted-foreground">{CONTENT_TYPE_LABELS[content.contentType]}</span>
        </div>
        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-primary-foreground", STATUS_COLORS[content.status])}>
          {STATUS_LABELS[content.status]}
        </span>
      </div>
      <h3 className="text-sm font-medium text-foreground mb-1.5 group-hover:text-primary transition-colors">{content.title}</h3>
      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{content.description}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-[10px] font-medium text-primary">{content.assignee.name.split(' ').map(n => n[0]).join('')}</span>
          </div>
          <span className="text-xs text-muted-foreground">{content.assignee.name.split(' ')[0]}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {new Date(content.publishDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
        </span>
      </div>
    </button>
  );
};

export { platformIcon };
export default ContentCard;
