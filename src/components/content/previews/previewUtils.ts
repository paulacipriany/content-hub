import { ContentWithRelations } from '@/data/types';

export const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').trim();

export const getAspectClass = (platform: string, contentType?: string) => {
  if (contentType === 'shorts' || contentType === 'reels' || contentType === 'stories') return 'aspect-[9/16]';
  if (contentType === 'feed' || contentType === 'carousel' || contentType === 'image') return 'aspect-[3/4]';
  return platform === 'instagram' ? 'aspect-[3/4]' : 'aspect-video';
};

export const getDisplayText = (content: ContentWithRelations, platform?: string, maxChars?: number) => {
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

export const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

export const getUserHandle = (name: string) =>
  name.toLowerCase().replace(/\s+/g, '.');
