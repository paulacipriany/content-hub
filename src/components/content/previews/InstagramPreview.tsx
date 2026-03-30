import { ContentWithRelations } from '@/data/types';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from 'lucide-react';
import { getDisplayText, getInitials, getUserHandle, getProjectLogo } from './previewUtils';
import MediaOrPlaceholder from './MediaOrPlaceholder';

const InstagramPreview = ({ content }: { content: ContentWithRelations }) => {
  const userName = content.project?.name ?? 'usuario';
  const initials = getInitials(userName);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden w-full">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[hsl(var(--platform-instagram))] to-[hsl(45,100%,51%)] p-[2px]">
          <div className="w-full h-full rounded-full bg-card flex items-center justify-center overflow-hidden">
            {getProjectLogo(content) ? (
              <img src={getProjectLogo(content)!} alt={userName} className="w-full h-full object-cover rounded-full" />
            ) : (
              <span className="text-[9px] font-bold text-foreground">{initials}</span>
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-[1px]">
          <span className="text-[13px] font-semibold text-foreground truncate leading-tight">{getUserHandle(userName)}</span>
          <span className="text-[11px] text-muted-foreground leading-tight">Patrocinado</span>
        </div>
        <MoreHorizontal size={16} className="text-muted-foreground" />
      </div>

      <MediaOrPlaceholder content={content} platform="instagram" />

      <div className="px-3 py-2.5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <Heart size={20} className="text-foreground" />
            <MessageCircle size={20} className="text-foreground" />
            <Send size={20} className="text-foreground" />
          </div>
          <Bookmark size={20} className="text-foreground" />
        </div>
        <p className="text-xs font-semibold text-foreground mb-1">128 curtidas</p>
        <div className="text-xs text-foreground">
          <span className="font-semibold">{getUserHandle(userName)} </span>
          <span className="whitespace-pre-wrap">{getDisplayText(content, 'instagram')}</span>
        </div>
      </div>
    </div>
  );
};

export default InstagramPreview;
