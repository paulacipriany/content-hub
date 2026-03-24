import { ContentWithRelations } from '@/data/types';
import { Star, ThumbsUp, MessageCircle, Share2 } from 'lucide-react';
import { getDisplayText, getInitials } from './previewUtils';
import MediaOrPlaceholder from './MediaOrPlaceholder';

const GoogleBusinessPreview = ({ content }: { content: ContentWithRelations }) => {
  const userName = content.project?.name ?? 'Empresa';
  const initials = getInitials(userName);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden max-w-[350px] mx-auto">
      <div className="flex items-center gap-2.5 px-3 py-3">
        <div className="w-10 h-10 rounded-full bg-[hsl(var(--platform-google-business))] flex items-center justify-center">
          <span className="text-xs font-bold text-white">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-foreground block">{userName}</span>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span>Publicação</span>
            <span>·</span>
            <span>Agora</span>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map(i => (
            <Star key={i} size={10} className="fill-amber-400 text-amber-400" />
          ))}
          <span className="text-[10px] text-muted-foreground ml-1">4.8</span>
        </div>
      </div>

      <MediaOrPlaceholder content={content} platform="google_business" />

      <div className="px-3 py-2.5">
        <p className="text-sm text-foreground whitespace-pre-wrap mb-2">
          {getDisplayText(content, 'google_business')}
        </p>
        <div className="flex items-center gap-2 border-t border-border pt-2">
          <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ThumbsUp size={14} /> Curtir
          </button>
          <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <MessageCircle size={14} /> Comentar
          </button>
          <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Share2 size={14} /> Compartilhar
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoogleBusinessPreview;
