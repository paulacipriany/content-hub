import { ContentWithRelations } from '@/data/types';
import { ThumbsUp, ThumbsDown, Share2, MoreHorizontal } from 'lucide-react';
import { getDisplayText, getInitials } from './previewUtils';
import MediaOrPlaceholder from './MediaOrPlaceholder';

const YouTubePreview = ({ content }: { content: ContentWithRelations }) => {
  const userName = content.project?.name ?? 'Canal';
  const initials = getInitials(userName);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden max-w-[350px] mx-auto">
      <div className="relative">
        <MediaOrPlaceholder content={content} platform="youtube" />
        <span className="absolute bottom-1 right-1 text-[10px] bg-black/80 text-white px-1 py-0.5 rounded">
          3:24
        </span>
      </div>

      <div className="px-3 py-2.5">
        <h3 className="text-sm font-semibold text-foreground line-clamp-2 mb-2">
          {content.title}
        </h3>
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-full bg-[hsl(var(--platform-youtube))] flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-bold text-white">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-medium text-foreground block">{userName}</span>
            <span className="text-[10px] text-muted-foreground">2,4 mil visualizações · há 1 dia</span>
          </div>
          <MoreHorizontal size={16} className="text-muted-foreground flex-shrink-0" />
        </div>

        <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap line-clamp-2">
          {getDisplayText(content, 'youtube', 120)}
        </p>

        <div className="flex items-center gap-3 mt-3 border-t border-border pt-2">
          <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ThumbsUp size={14} /> 156
          </button>
          <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ThumbsDown size={14} />
          </button>
          <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Share2 size={14} /> Compartilhar
          </button>
        </div>
      </div>
    </div>
  );
};

export default YouTubePreview;
