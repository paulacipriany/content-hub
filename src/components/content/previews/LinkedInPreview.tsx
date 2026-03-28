import { ContentWithRelations } from '@/data/types';
import { MessageCircle, MoreHorizontal, ThumbsUp, Send, Repeat2, Globe } from 'lucide-react';
import { getDisplayText, getInitials, getProjectLogo } from './previewUtils';
import MediaOrPlaceholder from './MediaOrPlaceholder';

const LinkedInPreview = ({ content }: { content: ContentWithRelations }) => {
  const userName = content.project?.name ?? 'Empresa';
  const initials = getInitials(userName);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden max-w-[350px] mx-auto">
      <div className="flex items-center gap-2.5 px-3 py-3">
        <div className="w-12 h-12 rounded-full bg-[hsl(var(--platform-linkedin))] flex items-center justify-center overflow-hidden">
          {getProjectLogo(content) ? (
            <img src={getProjectLogo(content)!} alt={userName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-white">{initials}</span>
          )}
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-[1px]">
          <span className="text-[13px] font-semibold text-foreground leading-tight">{userName}</span>
          <span className="text-[11px] text-muted-foreground leading-tight">Social Media Manager</span>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground leading-none mt-0.5">
            <span>Agora</span><span>·</span><Globe size={10} />
          </div>
        </div>
        <MoreHorizontal size={16} className="text-muted-foreground" />
      </div>

      <div className="px-3 pb-2">
        <p className="text-sm text-foreground whitespace-pre-wrap">{getDisplayText(content, 'linkedin')}</p>
      </div>

      <MediaOrPlaceholder content={content} platform="linkedin" />

      <div className="px-3 py-2 border-t border-border">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <div className="flex items-center gap-1"><span className="text-sm">👍🎉💡</span><span>37</span></div>
          <span>3 comentários · 1 repostagem</span>
        </div>
        <div className="flex border-t border-border pt-2">
          <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary rounded transition-colors"><ThumbsUp size={14} /> Gostei</button>
          <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary rounded transition-colors"><MessageCircle size={14} /> Comentar</button>
          <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary rounded transition-colors"><Repeat2 size={14} /> Repostar</button>
          <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary rounded transition-colors"><Send size={14} /> Enviar</button>
        </div>
      </div>
    </div>
  );
};

export default LinkedInPreview;
