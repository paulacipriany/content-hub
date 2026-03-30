import { ContentWithRelations } from '@/data/types';
import { Heart, MessageCircle, Repeat2, BarChart3, Upload, MoreHorizontal } from 'lucide-react';
import { getDisplayText, getInitials, getUserHandle, getProjectLogo } from './previewUtils';
import MediaOrPlaceholder from './MediaOrPlaceholder';

const TwitterPreview = ({ content }: { content: ContentWithRelations }) => {
  const userName = content.project?.name ?? 'Usuário';
  const initials = getInitials(userName);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden w-full">
      <div className="px-3 py-3">
        <div className="flex gap-2.5">
          <div className="w-10 h-10 rounded-full bg-[hsl(var(--platform-twitter))] flex items-center justify-center flex-shrink-0 overflow-hidden">
            {getProjectLogo(content) ? (
              <img src={getProjectLogo(content)!} alt={userName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold">{initials}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold text-foreground truncate">{userName}</span>
              <span className="text-sm text-muted-foreground truncate">@{getUserHandle(userName)}</span>
              <span className="text-sm text-muted-foreground">·</span>
              <span className="text-sm text-muted-foreground">agora</span>
              <MoreHorizontal size={16} className="text-muted-foreground ml-auto flex-shrink-0" />
            </div>

            <p className="text-sm text-foreground whitespace-pre-wrap mt-1">
              {getDisplayText(content, 'twitter')}
            </p>

            <div className="mt-2 rounded-xl overflow-hidden border border-border">
              <MediaOrPlaceholder content={content} platform="twitter" />
            </div>

            <div className="flex items-center justify-between mt-3 max-w-[300px]">
              <button className="flex items-center gap-1 text-muted-foreground hover:text-[hsl(210,100%,50%)] transition-colors">
                <MessageCircle size={15} />
                <span className="text-xs">12</span>
              </button>
              <button className="flex items-center gap-1 text-muted-foreground hover:text-[hsl(142,60%,45%)] transition-colors">
                <Repeat2 size={15} />
                <span className="text-xs">5</span>
              </button>
              <button className="flex items-center gap-1 text-muted-foreground hover:text-[hsl(350,80%,55%)] transition-colors">
                <Heart size={15} />
                <span className="text-xs">48</span>
              </button>
              <button className="flex items-center gap-1 text-muted-foreground hover:text-[hsl(210,100%,50%)] transition-colors">
                <BarChart3 size={15} />
                <span className="text-xs">1.2K</span>
              </button>
              <button className="text-muted-foreground hover:text-[hsl(210,100%,50%)] transition-colors">
                <Upload size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TwitterPreview;
