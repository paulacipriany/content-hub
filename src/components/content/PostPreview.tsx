import { ContentWithRelations, Platform } from '@/data/types';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, ThumbsUp, Share2, Globe, Repeat2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PostPreviewProps {
  content: ContentWithRelations;
  platform: Platform;
}

const MediaOrPlaceholder = ({ content, platform }: { content: ContentWithRelations; platform: string }) => {
  const mediaUrl = (content as any).media_url;
  const aspectClass = platform === 'instagram' ? 'aspect-square' : 'aspect-video';

  if (mediaUrl) {
    if (mediaUrl.match(/\.(mp4|webm|mov)$/i)) {
      return <video src={mediaUrl} controls className={cn("w-full object-cover", aspectClass)} />;
    }
    return <img src={mediaUrl} alt={content.title} className={cn("w-full object-cover", aspectClass)} />;
  }

  return (
    <div className={cn("w-full flex items-center justify-center bg-gradient-to-br from-muted to-secondary", aspectClass)}>
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
          <span className="text-2xl">📷</span>
        </div>
        <p className="text-xs text-muted-foreground">Imagem do post</p>
      </div>
    </div>
  );
};

const InstagramPreview = ({ content }: { content: ContentWithRelations }) => {
  const userName = content.creator_profile?.display_name ?? 'usuario';
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden max-w-[350px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[hsl(var(--platform-instagram))] to-[hsl(45,100%,51%)] p-[2px]">
          <div className="w-full h-full rounded-full bg-card flex items-center justify-center">
            <span className="text-[9px] font-bold text-foreground">{initials}</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold text-foreground block truncate">{userName.toLowerCase().replace(/\s+/g, '.')}</span>
          <span className="text-[10px] text-muted-foreground">Patrocinado</span>
        </div>
        <MoreHorizontal size={16} className="text-muted-foreground" />
      </div>

      {/* Image */}
      <MediaOrPlaceholder content={content} platform="instagram" />

      {/* Actions */}
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
          <span className="font-semibold">{userName.toLowerCase().replace(/\s+/g, '.')} </span>
          <span className="whitespace-pre-wrap">{content.description || content.title}</span>
        </div>
        {content.hashtags && content.hashtags.length > 0 && (
          <p className="text-xs text-primary mt-1">{content.hashtags.join(' ')}</p>
        )}
      </div>
    </div>
  );
};

const FacebookPreview = ({ content }: { content: ContentWithRelations }) => {
  const userName = content.creator_profile?.display_name ?? 'Usuário';
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden max-w-[350px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-3">
        <div className="w-10 h-10 rounded-full bg-[hsl(var(--platform-facebook))] flex items-center justify-center">
          <span className="text-xs font-bold text-white">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-foreground block">{userName}</span>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span>Agora</span>
            <span>·</span>
            <Globe size={10} />
          </div>
        </div>
        <MoreHorizontal size={16} className="text-muted-foreground" />
      </div>

      {/* Text */}
      <div className="px-3 pb-2">
        <p className="text-sm text-foreground whitespace-pre-wrap">{content.description || content.title}</p>
        {content.hashtags && content.hashtags.length > 0 && (
          <p className="text-sm text-primary mt-1">{content.hashtags.join(' ')}</p>
        )}
      </div>

      {/* Image */}
      <MediaOrPlaceholder content={content} platform="facebook" />

      {/* Reactions bar */}
      <div className="px-3 py-2 border-t border-border">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <div className="flex items-center gap-1">
            <span className="text-sm">👍❤️</span>
            <span>42</span>
          </div>
          <span>5 comentários · 2 compartilhamentos</span>
        </div>
        <div className="flex border-t border-border pt-2">
          <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary rounded transition-colors">
            <ThumbsUp size={14} /> Curtir
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary rounded transition-colors">
            <MessageCircle size={14} /> Comentar
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary rounded transition-colors">
            <Share2 size={14} /> Compartilhar
          </button>
        </div>
      </div>
    </div>
  );
};

const LinkedInPreview = ({ content }: { content: ContentWithRelations }) => {
  const userName = content.creator_profile?.display_name ?? 'Usuário';
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden max-w-[350px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-3">
        <div className="w-12 h-12 rounded-full bg-[hsl(var(--platform-linkedin))] flex items-center justify-center">
          <span className="text-sm font-bold text-white">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-foreground block">{userName}</span>
          <span className="text-[11px] text-muted-foreground block">Social Media Manager</span>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span>Agora</span>
            <span>·</span>
            <Globe size={10} />
          </div>
        </div>
        <MoreHorizontal size={16} className="text-muted-foreground" />
      </div>

      {/* Text */}
      <div className="px-3 pb-2">
        <p className="text-sm text-foreground whitespace-pre-wrap">{content.description || content.title}</p>
        {content.hashtags && content.hashtags.length > 0 && (
          <p className="text-sm text-primary mt-1.5">{content.hashtags.join(' ')}</p>
        )}
      </div>

      {/* Image */}
      <MediaOrPlaceholder content={content} platform="linkedin" />

      {/* Reactions */}
      <div className="px-3 py-2 border-t border-border">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <div className="flex items-center gap-1">
            <span className="text-sm">👍🎉💡</span>
            <span>37</span>
          </div>
          <span>3 comentários · 1 repostagem</span>
        </div>
        <div className="flex border-t border-border pt-2">
          <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary rounded transition-colors">
            <ThumbsUp size={14} /> Gostei
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary rounded transition-colors">
            <MessageCircle size={14} /> Comentar
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary rounded transition-colors">
            <Repeat2 size={14} /> Repostar
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary rounded transition-colors">
            <Send size={14} /> Enviar
          </button>
        </div>
      </div>
    </div>
  );
};

const PostPreview = ({ content, platform }: PostPreviewProps) => {
  switch (platform) {
    case 'instagram':
      return <InstagramPreview content={content} />;
    case 'facebook':
      return <FacebookPreview content={content} />;
    case 'linkedin':
      return <LinkedInPreview content={content} />;
    default:
      return (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Preview não disponível para {platform}
        </div>
      );
  }
};

export default PostPreview;
