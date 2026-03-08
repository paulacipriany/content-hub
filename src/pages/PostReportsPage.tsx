import { useState, useEffect, useCallback } from 'react';
import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useClientFromUrl } from '@/hooks/useClientFromUrl';
import { CONTENT_TYPE_LABELS, PLATFORM_LABELS, ContentType, Platform, ContentWithRelations } from '@/data/types';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Eye, Heart, MessageCircle, Share2, ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type AnalysisResult = 'positivo' | 'negativo' | 'neutro';

interface PostAnalysis {
  id: string;
  content_id: string;
  views: number;
  likes: number;
  comments_count: number;
  shares: number;
  analysis_text: string;
  result: AnalysisResult | null;
  created_by: string;
}

const resultOptions: { value: AnalysisResult; label: string; color: string }[] = [
  { value: 'positivo', label: 'Positivo', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  { value: 'negativo', label: 'Negativo', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  { value: 'neutro', label: 'Neutro', color: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800/40 dark:text-zinc-300' },
];

const contentTypeBadgeColors: Record<string, string> = {
  stories: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  post: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  feed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  reels: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  carousel: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  video: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  shorts: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  image: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
};

type Tab = 'analyzed' | 'not-analyzed';

const AnalysisRow = ({
  content,
  analysis,
  userId,
  onSaved,
}: {
  content: ContentWithRelations;
  analysis: PostAnalysis | null;
  userId: string;
  onSaved: () => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [views, setViews] = useState(analysis?.views ?? 0);
  const [likes, setLikes] = useState(analysis?.likes ?? 0);
  const [commentsCount, setCommentsCount] = useState(analysis?.comments_count ?? 0);
  const [shares, setShares] = useState(analysis?.shares ?? 0);
  const [analysisText, setAnalysisText] = useState(analysis?.analysis_text ?? '');
  const [result, setResult] = useState<AnalysisResult | null>(analysis?.result ?? null);
  const [saving, setSaving] = useState(false);

  const platforms = Array.isArray(content.platform) ? content.platform : [content.platform];

  const handleSave = async () => {
    setSaving(true);
    const data = {
      content_id: content.id,
      views,
      likes,
      comments_count: commentsCount,
      shares,
      analysis_text: analysisText,
      created_by: userId,
    };

    if (analysis) {
      await supabase.from('post_analyses').update(data as any).eq('id', analysis.id);
    } else {
      await supabase.from('post_analyses').insert(data as any);
    }
    setSaving(false);
    toast.success('Análise salva!');
    onSaved();
  };

  return (
    <div className="border-b border-border last:border-b-0">
      <div
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "grid grid-cols-[32px_1fr_140px_200px] items-center px-4 py-3 hover:bg-secondary/30 transition-colors cursor-pointer",
          expanded && "bg-secondary/20"
        )}
      >
        <div className="flex items-center">
          {expanded ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
        </div>
        <div className="min-w-0">
          <span className="text-sm font-medium text-foreground truncate block">{content.title}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          <span className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-md",
            contentTypeBadgeColors[content.content_type] || 'bg-secondary text-foreground'
          )}>
            {CONTENT_TYPE_LABELS[content.content_type as ContentType] || content.content_type}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {analysis ? (
            <>
              <span className="flex items-center gap-1"><Eye size={12} /> {analysis.views}</span>
              <span className="flex items-center gap-1"><Heart size={12} /> {analysis.likes}</span>
              <span className="flex items-center gap-1"><MessageCircle size={12} /> {analysis.comments_count}</span>
              <span className="flex items-center gap-1"><Share2 size={12} /> {analysis.shares}</span>
            </>
          ) : (
            <span className="text-muted-foreground/60 italic">Sem análise</span>
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-6 pb-4 pt-2 bg-secondary/10 border-t border-border/50">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1 mb-1">
                <Eye size={11} /> Visualizações
              </label>
              <Input
                type="number"
                min={0}
                value={views}
                onChange={e => setViews(Number(e.target.value))}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1 mb-1">
                <Heart size={11} /> Likes
              </label>
              <Input
                type="number"
                min={0}
                value={likes}
                onChange={e => setLikes(Number(e.target.value))}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1 mb-1">
                <MessageCircle size={11} /> Comentários
              </label>
              <Input
                type="number"
                min={0}
                value={commentsCount}
                onChange={e => setCommentsCount(Number(e.target.value))}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1 mb-1">
                <Share2 size={11} /> Compartilhamentos
              </label>
              <Input
                type="number"
                min={0}
                value={shares}
                onChange={e => setShares(Number(e.target.value))}
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1 block">
              Análise pós-publicação
            </label>
            <Textarea
              value={analysisText}
              onChange={e => setAnalysisText(e.target.value)}
              placeholder="Escreva sua análise sobre o desempenho deste conteúdo..."
              className="text-sm min-h-[80px]"
            />
          </div>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : analysis ? 'Atualizar análise' : 'Salvar análise'}
          </Button>
        </div>
      )}
    </div>
  );
};

const PostReportsPage = () => {
  useClientFromUrl();
  const { projectContents } = useApp();
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<PostAnalysis[]>([]);
  const [tab, setTab] = useState<Tab>('not-analyzed');

  const published = projectContents.filter(c => c.status === 'published');

  const fetchAnalyses = useCallback(async () => {
    const contentIds = published.map(c => c.id);
    if (contentIds.length === 0) { setAnalyses([]); return; }
    const { data } = await supabase
      .from('post_analyses')
      .select('*')
      .in('content_id', contentIds);
    setAnalyses((data as PostAnalysis[]) ?? []);
  }, [published.map(c => c.id).join(',')]);

  useEffect(() => { fetchAnalyses(); }, [fetchAnalyses]);

  const analysisMap = new Map(analyses.map(a => [a.content_id, a]));

  const analyzed = published.filter(c => analysisMap.has(c.id));
  const notAnalyzed = published.filter(c => !analysisMap.has(c.id));

  const currentList = tab === 'analyzed' ? analyzed : notAnalyzed;

  return (
    <>
      <TopBar title="Relatório de Postagens" subtitle="Análise pós-publicação dos conteúdos" />
      <div className="p-6">
        {/* Tabs */}
        <div className="flex items-center gap-1 mb-5">
          <button
            onClick={() => setTab('analyzed')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              tab === 'analyzed'
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary"
            )}
          >
            <FileText size={14} />
            Análise
            <span className="ml-1 text-xs opacity-70">{analyzed.length}</span>
          </button>
          <button
            onClick={() => setTab('not-analyzed')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              tab === 'not-analyzed'
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-secondary"
            )}
          >
            Sem análise
            <span className="ml-1 text-xs opacity-70">{notAnalyzed.length}</span>
          </button>
        </div>

        {/* Table */}
        <div className="border border-border rounded-xl overflow-hidden bg-card">
          <div className="grid grid-cols-[32px_1fr_140px_200px] items-center px-4 py-2.5 border-b border-border bg-secondary/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <div></div>
            <div>Título do Conteúdo</div>
            <div>Formato</div>
            <div>{tab === 'analyzed' ? 'Métricas' : 'Status'}</div>
          </div>

          {currentList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <p className="text-sm">
                {tab === 'analyzed'
                  ? 'Nenhum conteúdo analisado ainda.'
                  : 'Todos os conteúdos publicados já foram analisados!'}
              </p>
              {published.length === 0 && (
                <p className="text-xs mt-1">Publique conteúdos para vê-los aqui.</p>
              )}
            </div>
          ) : (
            currentList.map(content => (
              <AnalysisRow
                key={content.id}
                content={content}
                analysis={analysisMap.get(content.id) ?? null}
                userId={user?.id ?? ''}
                onSaved={fetchAnalyses}
              />
            ))
          )}
        </div>

        {published.length > 0 && (
          <p className="text-xs text-muted-foreground mt-3">
            {published.length} publicado(s) · {analyzed.length} analisado(s) · {notAnalyzed.length} pendente(s)
          </p>
        )}
      </div>
    </>
  );
};

export default PostReportsPage;
