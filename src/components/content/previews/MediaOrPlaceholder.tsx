import { ContentWithRelations } from '@/data/types';
import { cn } from '@/lib/utils';
import { getAspectClass } from './previewUtils';
import CarouselMedia from './CarouselMedia';

interface MediaOrPlaceholderProps {
  content: ContentWithRelations;
  platform: string;
}

const MediaOrPlaceholder = ({ content, platform }: MediaOrPlaceholderProps) => {
  const mediaUrls = (content as any).media_urls;
  const mediaUrl = (content as any).media_url;
  const aspectClass = getAspectClass(platform, content.content_type);

  const urls: string[] = mediaUrls && Array.isArray(mediaUrls) && mediaUrls.length > 0
    ? mediaUrls
    : mediaUrl ? [mediaUrl] : [];
  const poster = (content as any).thumbnail_url;

  if (urls.length > 0) {
    return <CarouselMedia urls={urls} platform={platform} contentType={content.content_type} poster={poster} />;
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

export default MediaOrPlaceholder;
