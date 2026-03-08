export type Platform = 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'youtube';
export type ContentType = 'feed' | 'reels' | 'stories' | 'carousel' | 'video';
export type WorkflowStatus = 'idea' | 'production' | 'review' | 'approval-client' | 'scheduled' | 'published';
export type UserRole = 'admin' | 'manager' | 'social-media' | 'client';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: UserRole;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

export interface ContentItem {
  id: string;
  title: string;
  description: string;
  platform: Platform;
  contentType: ContentType;
  status: WorkflowStatus;
  assignee: User;
  publishDate: string;
  hashtags: string[];
  comments: Comment[];
  projectId: string;
  createdAt: string;
  checklist: { id: string; text: string; done: boolean }[];
}

export interface Project {
  id: string;
  name: string;
  color: string;
  contentCount: number;
}

export const STATUS_LABELS: Record<WorkflowStatus, string> = {
  'idea': 'Ideia',
  'production': 'Produção',
  'review': 'Revisão',
  
  'approval-client': 'Aprovação Cliente',
  'scheduled': 'Agendado',
  'published': 'Publicado',
};

export const STATUS_COLORS: Record<WorkflowStatus, string> = {
  'idea': 'bg-status-idea',
  'production': 'bg-status-production',
  'review': 'bg-status-review',
  'approval-internal': 'bg-status-approval',
  'approval-client': 'bg-status-approval',
  'scheduled': 'bg-status-scheduled',
  'published': 'bg-status-published',
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  youtube: 'YouTube',
};

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  feed: 'Feed',
  reels: 'Reels',
  stories: 'Stories',
  carousel: 'Carrossel',
  video: 'Vídeo',
};

const users: User[] = [
  { id: '1', name: 'Ana Silva', email: 'ana@socialflow.com', role: 'admin' },
  { id: '2', name: 'Pedro Costa', email: 'pedro@socialflow.com', role: 'social-media' },
  { id: '3', name: 'Maria Santos', email: 'maria@socialflow.com', role: 'manager' },
  { id: '4', name: 'João Cliente', email: 'joao@cliente.com', role: 'client' },
];

export const mockProjects: Project[] = [
  { id: 'p1', name: 'Kestal Ortopédicos', color: '#F97316', contentCount: 24 },
  { id: 'p2', name: 'Studio Fitness', color: '#8B5CF6', contentCount: 18 },
  { id: 'p3', name: 'Café Artesanal', color: '#10B981', contentCount: 12 },
  { id: 'p4', name: 'Tech Solutions', color: '#3B82F6', contentCount: 30 },
];

export const mockContents: ContentItem[] = [
  {
    id: 'c1', title: 'Post #1: Benefícios do produto', description: 'Apresentar os 5 principais benefícios do nosso produto.', platform: 'instagram', contentType: 'carousel', status: 'published', assignee: users[1], publishDate: '2026-03-02', hashtags: ['#saude', '#bemestar'], comments: [{ id: 'cm1', userId: '3', userName: 'Maria Santos', text: 'Aprovado! Ótimo conteúdo.', createdAt: '2026-03-01' }], projectId: 'p1', createdAt: '2026-02-25',
    checklist: [{ id: 'ck1', text: 'Criar copy', done: true }, { id: 'ck2', text: 'Design visual', done: true }, { id: 'ck3', text: 'Revisão final', done: true }],
  },
  {
    id: 'c2', title: 'Stories #1: Dicas rápidas', description: 'Sequência de 5 stories com dicas rápidas.', platform: 'instagram', contentType: 'stories', status: 'scheduled', assignee: users[1], publishDate: '2026-03-05', hashtags: ['#dicas'], comments: [], projectId: 'p1', createdAt: '2026-02-28',
    checklist: [{ id: 'ck4', text: 'Roteiro', done: true }, { id: 'ck5', text: 'Gravação', done: true }, { id: 'ck6', text: 'Edição', done: false }],
  },
  {
    id: 'c3', title: 'Post #2: Lançamento campanha', description: 'Anúncio da nova campanha de verão.', platform: 'facebook', contentType: 'feed', status: 'approval-client', assignee: users[1], publishDate: '2026-03-08', hashtags: ['#campanha', '#verao'], comments: [{ id: 'cm2', userId: '4', userName: 'João Cliente', text: 'Pode ajustar a cor de fundo?', createdAt: '2026-03-06' }], projectId: 'p2', createdAt: '2026-03-01',
    checklist: [{ id: 'ck7', text: 'Briefing', done: true }, { id: 'ck8', text: 'Copy', done: true }, { id: 'ck9', text: 'Design', done: true }],
  },
  {
    id: 'c4', title: 'Reels: Bastidores', description: 'Vídeo mostrando os bastidores da produção.', platform: 'instagram', contentType: 'reels', status: 'production', assignee: users[0], publishDate: '2026-03-10', hashtags: ['#bastidores', '#behindthescenes'], comments: [], projectId: 'p1', createdAt: '2026-03-02',
    checklist: [{ id: 'ck10', text: 'Roteiro', done: true }, { id: 'ck11', text: 'Filmagem', done: false }, { id: 'ck12', text: 'Edição', done: false }],
  },
  {
    id: 'c5', title: 'Post #3: Dicas de ergonomia', description: 'Post educativo sobre ergonomia no trabalho.', platform: 'linkedin', contentType: 'feed', status: 'review', assignee: users[2], publishDate: '2026-03-12', hashtags: ['#ergonomia', '#trabalho'], comments: [], projectId: 'p4', createdAt: '2026-03-03',
    checklist: [{ id: 'ck13', text: 'Pesquisa', done: true }, { id: 'ck14', text: 'Texto', done: true }, { id: 'ck15', text: 'Revisão', done: false }],
  },
  {
    id: 'c6', title: 'Vídeo: Tutorial completo', description: 'Tutorial em vídeo sobre como usar o produto.', platform: 'youtube', contentType: 'video', status: 'idea', assignee: users[0], publishDate: '2026-03-15', hashtags: ['#tutorial'], comments: [], projectId: 'p3', createdAt: '2026-03-04',
    checklist: [{ id: 'ck16', text: 'Roteiro', done: false }],
  },
  {
    id: 'c7', title: 'Post #4: Dia da Mulher', description: 'Homenagem ao Dia Internacional da Mulher.', platform: 'instagram', contentType: 'feed', status: 'published', assignee: users[1], publishDate: '2026-03-08', hashtags: ['#diadamulher', '#8demarco'], comments: [], projectId: 'p1', createdAt: '2026-03-05',
    checklist: [{ id: 'ck17', text: 'Copy', done: true }, { id: 'ck18', text: 'Design', done: true }],
  },
  {
    id: 'c8', title: 'Stories #2: Enquete', description: 'Stories interativos com enquete.', platform: 'instagram', contentType: 'stories', status: 'approval-internal', assignee: users[1], publishDate: '2026-03-14', hashtags: ['#enquete'], comments: [], projectId: 'p2', createdAt: '2026-03-06',
    checklist: [{ id: 'ck19', text: 'Criar enquete', done: true }, { id: 'ck20', text: 'Design', done: true }],
  },
  {
    id: 'c9', title: 'Post #5: Promoção especial', description: 'Divulgação de promoção de março.', platform: 'tiktok', contentType: 'reels', status: 'production', assignee: users[0], publishDate: '2026-03-18', hashtags: ['#promocao', '#desconto'], comments: [], projectId: 'p3', createdAt: '2026-03-07',
    checklist: [{ id: 'ck21', text: 'Briefing', done: true }, { id: 'ck22', text: 'Gravação', done: false }],
  },
  {
    id: 'c10', title: 'Carrossel: 10 motivos', description: '10 motivos para escolher nosso serviço.', platform: 'instagram', contentType: 'carousel', status: 'idea', assignee: users[2], publishDate: '2026-03-20', hashtags: ['#motivos'], comments: [], projectId: 'p4', createdAt: '2026-03-08',
    checklist: [{ id: 'ck23', text: 'Listar motivos', done: false }],
  },
];

export const mockUsers = users;
