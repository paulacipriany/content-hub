import { ContentWithRelations } from '@/data/types';
import { Heart, MessageCircle, Share2, Bookmark, Music } from 'lucide-react';
import { getDisplayText, getInitials, getUserHandle, getProjectLogo } from './previewUtils';
import MediaOrPlaceholder from './MediaOrPlaceholder';

const TikTokPreview = ({ content }: { content: ContentWithRelations }) => {
  const userName = content.project?.name ?? 'usuario';
  const initials = getInitials(userName);

  return (
    <div className="bg-[hsl(var(--platform-tiktok))] border border-border rounded-lg overflow-hidden max-w-[350px] mx-auto relative">
      <MediaOrPlaceholder content={content} platform="tiktok" />

      {/* Overlay content */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        <div className="flex items-end gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center border border-white/30 overflow-hidden">
                {getProjectLogo(content) ? (
                  <img src={getProjectLogo(content)!} alt={userName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[9px] font-bold text-white">{initials}</span>
                )}
              </div>
              <span className="text-xs font-semibold text-white">@{getUserHandle(userName)}</span>
            </div>
            <p className="text-xs text-white/90 whitespace-pre-wrap line-clamp-2 mb-2">
              {getDisplayText(content, 'tiktok', 100)}
            </p>
            <div className="flex items-center gap-1.5 text-white/70">
              <Music size={10} />
              <span className="text-[10px] truncate">som original - {getUserHandle(userName)}</span>
            </div>
          </div>

          {/* Right side action buttons */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex flex-col items-center">
              <Heart size={22} className="text-white" />
              <span className="text-[10px] text-white">1.2K</span>
            </div>
            <div className="flex flex-col items-center">
              <MessageCircle size={22} className="text-white" />
              <span className="text-[10px] text-white">48</span>
            </div>
            <div className="flex flex-col items-center">
              <Bookmark size={22} className="text-white" />
              <span className="text-[10px] text-white">215</span>
            </div>
            <div className="flex flex-col items-center">
              <Share2 size={22} className="text-white" />
              <span className="text-[10px] text-white">89</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TikTokPreview;
