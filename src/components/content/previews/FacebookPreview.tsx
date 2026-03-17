import { ContentWithRelations } from '@/data/types';
import { MessageCircle, MoreHorizontal, ThumbsUp, Share2, Globe } from 'lucide-react';
import { getDisplayText, getInitials } from './previewUtils';
import MediaOrPlaceholder from './MediaOrPlaceholder';

const FacebookPreview = ({ content }: { content: ContentWithRelations }) => {
  const userName = content.creator_profile?.display_name ?? 'Usuário';
  const initials = getInitials(userName);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden max-w-[350px] mx-auto">
      <div className="flex items-center gap-2.5 px-3 py-3">
        <div className="w-10 h-10 rounded-full bg-[hsl(var(--platform-facebook))] flex items-center justify-center">
          <span className="text-xs font-bold text-white">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-foreground block">{userName}</span>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span>Agora</span><span>·</span><Globe size={10} />
          </div>
        </div>
        <MoreHorizontal size={16} className="text-muted-foreground" />
      </div>

      <div className="px-3 pb-2">
        <p className="text-sm text-foreground whitespace-pre-wrap">{getDisplayText(content, 'facebook')}</p>
      </div>

      <MediaOrPlaceholder content={content} platform="facebook" />

      <div className="px-3 py-2 border-t border-border">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <div className="flex items-center gap-1"><span className="text-sm">👍❤️</span><span>42</span></div>
          <span>5 comentários · 2 compartilhamentos</span>
        </div>
        <div className="flex border-t border-border pt-2">
          <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary rounded transition-colors"><ThumbsUp size={14} /> Curtir</button>
          <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary rounded transition-colors"><MessageCircle size={14} /> Comentar</button>
          <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary rounded transition-colors"><Share2 size={14} /> Compartilhar</button>
        </div>
      </div>
    </div>
  );
};

export default FacebookPreview;
