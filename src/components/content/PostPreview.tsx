import { ContentWithRelations, Platform } from '@/data/types';
import InstagramPreview from './previews/InstagramPreview';
import FacebookPreview from './previews/FacebookPreview';
import LinkedInPreview from './previews/LinkedInPreview';
import TikTokPreview from './previews/TikTokPreview';
import YouTubePreview from './previews/YouTubePreview';
import PinterestPreview from './previews/PinterestPreview';
import TwitterPreview from './previews/TwitterPreview';
import GoogleBusinessPreview from './previews/GoogleBusinessPreview';
import BlogPreview from './previews/BlogPreview';
import StoriesPreview from './previews/StoriesPreview';

interface PostPreviewProps {
  content: ContentWithRelations;
  platform: Platform;
  compact?: boolean;
}

function truncateStr(str: string | null | undefined, max: number): string {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

const PostPreview = ({ content, platform, compact }: PostPreviewProps) => {
  const hasMedia = (content.media_urls && content.media_urls.length > 0) || content.media_url;
  const hasCopy = (content.copy_text && content.copy_text.trim().length > 0) || 
                  (content.copy_texts && Object.values(content.copy_texts as any).some(v => typeof v === 'string' && v.trim().length > 0));

  if (!hasMedia && !hasCopy) {
    return (
      <div className="py-4 text-center">
        <p className="text-[11px] text-muted-foreground/50 font-bold tracking-widest uppercase">
          Adicione conteúdo para visualizar
        </p>
      </div>
    );
  }

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

  // Stories get a dedicated preview regardless of platform
  if (displayContent.content_type === 'stories') {
    return <StoriesPreview content={displayContent} />;
  }

  switch (platform) {
    case 'instagram':
      return <InstagramPreview content={displayContent} />;
    case 'facebook':
      return <FacebookPreview content={displayContent} />;
    case 'linkedin':
      return <LinkedInPreview content={displayContent} />;
    case 'tiktok':
      return <TikTokPreview content={displayContent} />;
    case 'youtube':
      return <YouTubePreview content={displayContent} />;
    case 'pinterest':
      return <PinterestPreview content={displayContent} />;
    case 'twitter':
      return <TwitterPreview content={displayContent} />;
    case 'google_business':
      return <GoogleBusinessPreview content={displayContent} />;
    case 'blog':
      return <BlogPreview content={displayContent} />;
    default:
      return (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Preview não disponível para {platform}
        </div>
      );
  }
};

export default PostPreview;
