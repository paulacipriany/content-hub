import { ContentWithRelations } from '@/data/types';
import { X, Heart, Send, MoreHorizontal, ChevronUp } from 'lucide-react';
import { getDisplayText, getInitials, getUserHandle, getProjectLogo } from './previewUtils';
import MediaOrPlaceholder from './MediaOrPlaceholder';

const StoriesPreview = ({ content }: { content: ContentWithRelations }) => {
  const userName = content.project?.name ?? 'usuario';
  const initials = getInitials(userName);
  const platform = Array.isArray(content.platform) ? content.platform[0] : content.platform;
  const text = getDisplayText(content, platform, 80);

  return (
    <div className="bg-black rounded-xl overflow-hidden max-w-[280px] mx-auto relative aspect-[9/16]">
      {/* Media fills entire story */}
      <div className="absolute inset-0">
        <MediaOrPlaceholder content={{ ...content, content_type: 'stories' } as ContentWithRelations} platform={platform || 'instagram'} />
      </div>

      {/* Top gradient overlay */}
      <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-black/60 to-transparent z-10" />

      {/* Progress bar */}
      <div className="absolute top-2 left-2 right-2 z-20 flex gap-1">
        <div className="flex-1 h-[2px] rounded-full bg-white/30 overflow-hidden">
          <div className="h-full w-[70%] bg-white rounded-full" />
        </div>
        <div className="flex-1 h-[2px] rounded-full bg-white/30" />
        <div className="flex-1 h-[2px] rounded-full bg-white/30" />
      </div>

      {/* User header */}
      <div className="absolute top-5 left-0 right-0 z-20 flex items-center gap-2 px-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-yellow-400 p-[2px] shrink-0">
          <div className="w-full h-full rounded-full bg-black/60 flex items-center justify-center overflow-hidden">
            {getProjectLogo(content) ? (
              <img src={getProjectLogo(content)!} alt={userName} className="w-full h-full object-cover rounded-full" />
            ) : (
              <span className="text-[8px] font-bold text-white">{initials}</span>
            )}
          </div>
        </div>
        <span className="text-[11px] font-semibold text-white truncate">{getUserHandle(userName)}</span>
        <span className="text-[10px] text-white/60">2h</span>
        <div className="ml-auto flex items-center gap-2">
          <MoreHorizontal size={16} className="text-white/80" />
          <X size={16} className="text-white/80" />
        </div>
      </div>

      {/* Bottom gradient overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/70 to-transparent z-10" />

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-3 pb-4">


        {/* Reply bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-full border border-white/30 px-3 py-1.5">
            <span className="text-[10px] text-white/50">Enviar mensagem</span>
          </div>
          <Heart size={18} className="text-white/80" />
          <Send size={18} className="text-white/80" />
        </div>
      </div>
    </div>
  );
};

export default StoriesPreview;
