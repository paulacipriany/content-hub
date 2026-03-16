import { useState } from 'react';
import { ContentWithRelations, Platform } from '@/data/types';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, ThumbsUp, Share2, Globe, Repeat2, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PostPreviewProps {
  content: ContentWithRelations;
  platform: Platform;
  compact?: boolean;
}

const getAspectClass = (platform: string, contentType?: string) => {
  if (contentType === 'shorts' || contentType === 'reels' || contentType === 'stories') return 'aspect-[9/16]';
  return platform === 'instagram' ? 'aspect-square' : 'aspect-video';
};

const CarouselMedia = ({ urls, platform, contentType }: { urls: string[]; platform: string; contentType?: string }) => {
  const [current, setCurrent] = useState(0);
  const aspectClass = getAspectClass(platform, contentType);

  return (
    <div className="relative group">
      {urls[current].match(/\.(mp4|webm|mov)$/i) ? (
        <video src={urls[current]} controls className={cn("w-full object-cover", aspectClass)} />
      ) : (
        <img src={urls[current]} alt={`Slide ${current + 1}`} className={cn("w-full object-cover", aspectClass)} />
      )}
      {urls.length > 1 && (
        <>
          {current > 0 && (
            <button
              onClick={() => setCurrent(c => c - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft size={14} />
            </button>
          )}
          {current < urls.length - 1 && (
            <button
              onClick={() => setCurrent(c => c + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight size={14} />
            </button>
          )}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {urls.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-colors",
                  i === current ? "bg-white" : "bg-white/40"
                )}
              />
            ))}
          </div>
          <span className="absolute top-2 right-2 text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded-full">
            {current + 1}/{urls.length}
          </span>
        </>
      )}
    </div>
  );
};

const MediaOrPlaceholder = ({ content, platform }: { content: ContentWithRelations; platform: string }) => {
  const mediaUrls = (content as any).media_urls;
  const mediaUrl = (content as any).media_url;
  const aspectClass = getAspectClass(platform, content.content_type);

  const urls: string[] = mediaUrls && Array.isArray(mediaUrls) && mediaUrls.length > 0
    ? mediaUrls
    : mediaUrl ? [mediaUrl] : [];

  if (urls.length > 0) {
    return <CarouselMedia urls={urls} platform={platform} />;
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

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').trim();

const getDisplayText = (content: ContentWithRelations, platform?: string, maxChars?: number) => {
  const copyTexts = (content as any).copy_texts;
  let text = '';
  if (platform && copyTexts && typeof copyTexts === 'object' && copyTexts[platform]) {
    text = copyTexts[platform];
  } else {
    const copyText = (content as any).copy_text;
    text = copyText || content.description || content.title;
  }
  text = stripHtml(text);
  if (maxChars && text.length > maxChars) {
    return text.slice(0, maxChars) + '...';
  }
  return text;
};

const InstagramPreview = ({ content }: { content: ContentWithRelations }) => {
  const userName = content.creator_profile?.display_name ?? 'usuario';
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden max-w-[350px] mx-auto">
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
          <span className="font-semibold">{userName.toLowerCase().replace(/\s+/g, '.')} </span>
          <span className="whitespace-pre-wrap">{getDisplayText(content, 'instagram')}</span>
        </div>
      </div>
    </div>
  );
};

const FacebookPreview = ({ content }: { content: ContentWithRelations }) => {
  const userName = content.creator_profile?.display_name ?? 'Usuário';
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

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

const LinkedInPreview = ({ content }: { content: ContentWithRelations }) => {
  const userName = content.creator_profile?.display_name ?? 'Usuário';
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden max-w-[350px] mx-auto">
      <div className="flex items-center gap-2.5 px-3 py-3">
        <div className="w-12 h-12 rounded-full bg-[hsl(var(--platform-linkedin))] flex items-center justify-center">
          <span className="text-sm font-bold text-white">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-foreground block">{userName}</span>
          <span className="text-[11px] text-muted-foreground block">Social Media Manager</span>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
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

const PostPreview = ({ content, platform, compact }: PostPreviewProps) => {
  const truncatedCopyTexts = compact && (content as any).copy_texts
    ? Object.fromEntries(
        Object.entries((content as any).copy_texts).map(([k, v]) => [k, truncateStr(v as string, 120)])
      )
    : (content as any).copy_texts;

  const displayContent = compact ? {
    ...content,
    copy_text: truncateStr((content as any).copy_text, 120),
    copy_texts: truncatedCopyTexts,
    description: truncateStr(content.description, 120),
  } as ContentWithRelations : content;

  switch (platform) {
    case 'instagram':
      return <InstagramPreview content={displayContent} />;
    case 'facebook':
      return <FacebookPreview content={displayContent} />;
    case 'linkedin':
      return <LinkedInPreview content={displayContent} />;
    default:
      return (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Preview não disponível para {platform}
        </div>
      );
  }
};

function truncateStr(str: string | null | undefined, max: number): string {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

export default PostPreview;
