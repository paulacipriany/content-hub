import { ContentWithRelations } from '@/data/types';
import { Clock, User } from 'lucide-react';
import { getDisplayText, getInitials } from './previewUtils';
import MediaOrPlaceholder from './MediaOrPlaceholder';

const BlogPreview = ({ content }: { content: ContentWithRelations }) => {
  const userName = content.project?.name ?? 'Autor';
  const initials = getInitials(userName);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden max-w-[350px] mx-auto">
      <MediaOrPlaceholder content={content} platform="blog" />

      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wide">
            Blog
          </span>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock size={10} />
            <span>5 min de leitura</span>
          </div>
        </div>

        <h2 className="text-base font-bold text-foreground leading-tight mb-2 line-clamp-2">
          {content.title}
        </h2>

        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-3">
          {getDisplayText(content, 'blog', 150)}
        </p>

        <div className="flex items-center gap-2.5 border-t border-border pt-3">
          <div className="w-8 h-8 rounded-full bg-[hsl(var(--platform-blog))] flex items-center justify-center">
            <span className="text-[9px] font-bold text-white">{initials}</span>
          </div>
          <div>
            <span className="text-xs font-semibold text-foreground block">{userName}</span>
            <span className="text-[10px] text-muted-foreground">Publicado agora</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogPreview;
