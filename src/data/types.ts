import { Tables } from '@/integrations/supabase/types';

// DB-backed types
export type DbProject = Tables<'projects'> & { logo_url?: string | null };
export type DbContent = Tables<'contents'>;
export type DbComment = Tables<'comments'>;
export type DbChecklistItem = Tables<'checklist_items'>;
export type DbApproval = Tables<'approvals'>;
export type DbProfile = Tables<'profiles'>;
export type DbStatusHistory = Tables<'status_history'>;

// Extended content with relations
export type ContentWithRelations = DbContent & {
  media_url?: string | null;
  assignee_profile?: DbProfile | null;
  creator_profile?: DbProfile | null;
  project?: DbProject | null;
  comments?: (DbComment & { profile?: DbProfile | null })[];
  checklist_items?: DbChecklistItem[];
};

// Keep label/color maps for UI
export type Platform = 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'youtube' | 'pinterest' | 'twitter' | 'google_business' | 'blog';
export type ContentType = 'feed' | 'reels' | 'stories' | 'carousel' | 'video' | 'post' | 'shorts' | 'image' | 'artigo';
export type WorkflowStatus = 'idea' | 'idea-bank' | 'production' | 'review' | 'approval-client' | 'scheduled' | 'programmed' | 'published';

export const STATUS_LABELS: Record<WorkflowStatus, string> = {
  'idea': 'Rascunho',
  'idea-bank': 'Banco de Ideias',
  'production': 'Produção',
  'review': 'Revisão',
  
  'approval-client': 'Aprovação Cliente',
  'scheduled': 'Aguardando Agendamento',
  'programmed': 'Programado',
  'published': 'Publicado',
};

export const STATUS_COLORS: Record<WorkflowStatus, string> = {
  'idea': 'bg-status-idea',
  'idea-bank': 'bg-status-idea',
  'production': 'bg-status-production',
  'review': 'bg-status-review',
  
  'approval-client': 'bg-status-approval-client',
  'scheduled': 'bg-status-scheduled',
  'programmed': 'bg-status-programmed',
  'published': 'bg-status-published',
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  pinterest: 'Pinterest',
  twitter: 'X (Twitter)',
  google_business: 'Google Business',
  blog: 'Blog',
};

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  feed: 'Feed',
  reels: 'Reels',
  stories: 'Stories',
  carousel: 'Carrossel',
  video: 'Vídeo',
  post: 'Post',
  shorts: 'Vídeo Curto',
  image: 'Imagem',
};

// Content types visible in UI (carousel merged into feed)
export const VISIBLE_CONTENT_TYPES: ContentType[] = ['feed', 'reels', 'stories', 'video', 'post', 'shorts', 'image'];
