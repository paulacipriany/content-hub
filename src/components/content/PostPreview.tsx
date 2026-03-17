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
