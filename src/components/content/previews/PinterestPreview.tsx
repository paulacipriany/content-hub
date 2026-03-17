import { ContentWithRelations } from '@/data/types';
import { MoreHorizontal, ExternalLink, Upload } from 'lucide-react';
import { getDisplayText, getInitials } from './previewUtils';
import MediaOrPlaceholder from './MediaOrPlaceholder';

const PinterestPreview = ({ content }: { content: ContentWithRelations }) => {
  const userName = content.creator_profile?.display_name ?? 'Usuário';
  const initials = getInitials(userName);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden max-w-[280px] mx-auto">
      <div className="relative group">
        <MediaOrPlaceholder content={content} platform="pinterest" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors">
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5">
            <button className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center">
              <Upload size={12} className="text-foreground" />
            </button>
            <button className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center">
              <ExternalLink size={12} className="text-foreground" />
            </button>
            <button className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center">
              <MoreHorizontal size={12} className="text-foreground" />
            </button>
          </div>
          <button className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity bg-[hsl(var(--platform-pinterest))] text-white text-xs font-semibold px-3 py-1.5 rounded-full">
            Salvar
          </button>
        </div>
      </div>

      <div className="px-3 py-2.5">
        <p className="text-sm font-semibold text-foreground line-clamp-2 mb-2">
          {content.title}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          {getDisplayText(content, 'pinterest', 80)}
        </p>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[hsl(var(--platform-pinterest))] flex items-center justify-center">
            <span className="text-[9px] font-bold text-white">{initials}</span>
          </div>
          <span className="text-xs font-medium text-foreground">{userName}</span>
        </div>
      </div>
    </div>
  );
};

export default PinterestPreview;
