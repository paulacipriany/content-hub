import { useState, useEffect, useCallback } from 'react';
import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useClientFromUrl } from '@/hooks/useClientFromUrl';
import { CONTENT_TYPE_LABELS, PLATFORM_LABELS, ContentType, Platform, ContentWithRelations } from '@/data/types';
import { platformIcon, PLATFORM_ICONS } from '@/components/content/PlatformIcons';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Eye, Heart, MessageCircle, Share2, ChevronDown, ChevronRight, FileText, Repeat2, Bookmark, Activity, UserCheck, Users, UserPlus, Target } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type AnalysisResult = 'positivo' | 'negativo' | 'neutro';

interface PlatformMetrics {
  views: number;
  likes: number;
  comments_count: number;
  shares: number;
  // Instagram-specific
  reposts?: number;
  saves?: number;
  interactions?: number;
  interactions_followers?: number;
  interactions_non_followers?: number;
  profile_activity?: number;
  views_followers?: number;
  views_non_followers?: number;
  accounts_reached?: number;
}

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
  platform_metrics?: Record<string, PlatformMetrics>;
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
  readOnly = false,
}: {
  content: ContentWithRelations;
  analysis: PostAnalysis | null;
  userId: string;
  onSaved: () => void;
  readOnly?: boolean;
}) => {
  const [expanded, setExpanded] = useState(false);
  const platforms = Array.isArray(content.platform) ? content.platform : [content.platform];

  // Per-platform metrics state
  const initMetrics = (p: string): PlatformMetrics => {
    const saved = analysis?.platform_metrics?.[p];
    return saved ?? { views: 0, likes: 0, comments_count: 0, shares: 0 };
  };

  const [platformMetrics, setPlatformMetrics] = useState<Record<string, PlatformMetrics>>(() => {
    const m: Record<string, PlatformMetrics> = {};
    platforms.forEach(p => { m[p] = initMetrics(p); });
    return m;
  });
  const [activePlatform, setActivePlatform] = useState(platforms[0]);
  const [analysisText, setAnalysisText] = useState(analysis?.analysis_text ?? '');
  const [result, setResult] = useState<AnalysisResult | null>(analysis?.result ?? null);
  const [saving, setSaving] = useState(false);

  const updateMetric = (platform: string, field: keyof PlatformMetrics, value: number) => {
    setPlatformMetrics(prev => ({
      ...prev,
      [platform]: { ...prev[platform], [field]: value },
    }));
  };

  // Compute totals from all platforms
  const totals = Object.values(platformMetrics).reduce(
    (acc, m) => ({
      views: acc.views + m.views,
      likes: acc.likes + m.likes,
      comments_count: acc.comments_count + m.comments_count,
      shares: acc.shares + m.shares,
    }),
    { views: 0, likes: 0, comments_count: 0, shares: 0 }
  );

  const handleSave = async () => {
    setSaving(true);
    const data = {
      content_id: content.id,
      views: totals.views,
      likes: totals.likes,
      comments_count: totals.comments_count,
      shares: totals.shares,
      platform_metrics: platformMetrics,
      analysis_text: analysisText,
      result,
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

  const currentMetrics = platformMetrics[activePlatform] ?? { views: 0, likes: 0, comments_count: 0, shares: 0 };

  const MetricsFields = ({ metrics, platform, editable }: { metrics: PlatformMetrics; platform: string; editable: boolean }) => {
    const isInstagram = platform === 'instagram';
    const Field = ({ icon, label, field }: { icon: React.ReactNode; label: string; field: keyof PlatformMetrics }) => (
      <div>
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1 mb-1">{icon} {label}</label>
        {editable ? (
          <Input type="number" min={0} value={metrics[field] ?? 0} onChange={e => updateMetric(platform, field, Number(e.target.value))} className="h-8 text-sm" />
        ) : (
          <p className="text-sm font-medium text-foreground">{(metrics[field] ?? 0).toLocaleString('pt-BR')}</p>
        )}
      </div>
    );

    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {!isInstagram && <Field icon={<Eye size={11} />} label="Visualizações" field="views" />}
        <Field icon={<Heart size={11} />} label="Likes" field="likes" />
        <Field icon={<MessageCircle size={11} />} label="Comentários" field="comments_count" />
        <Field icon={<Share2 size={11} />} label="Compartilhamentos" field="shares" />
        {isInstagram && (
          <>
            <Field icon={<Repeat2 size={11} />} label="Reposts" field="reposts" />
            <Field icon={<Bookmark size={11} />} label="Salvos" field="saves" />
            <Field icon={<Activity size={11} />} label="Interações" field="interactions" />
            <Field icon={<UserCheck size={11} />} label="Atividades do perfil" field="profile_activity" />
            <Field icon={<Eye size={11} />} label="Visualizações" field="views" />
            <Field icon={<Users size={11} />} label="Visualizações seguidores" field="views_followers" />
            <Field icon={<UserPlus size={11} />} label="Visualizações não seguidores" field="views_non_followers" />
            <Field icon={<Target size={11} />} label="Contas alcançadas" field="accounts_reached" />
          </>
        )}
      </div>
    );
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
              <span className="flex items-center gap-1"><Eye size={12} /> {totals.views}</span>
              <span className="flex items-center gap-1"><Heart size={12} /> {totals.likes}</span>
              <span className="flex items-center gap-1"><MessageCircle size={12} /> {totals.comments_count}</span>
              <span className="flex items-center gap-1"><Share2 size={12} /> {totals.shares}</span>
              {analysis.result && (
                <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-medium", resultOptions.find(o => o.value === analysis.result)?.color)}>
                  {resultOptions.find(o => o.value === analysis.result)?.label}
                </span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground/60 italic">Sem análise</span>
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-6 pb-4 pt-2 bg-secondary/10 border-t border-border/50">
          {/* Platform tabs */}
          {platforms.length > 1 && (
            <div className="flex items-center gap-1 mb-4 border-b border-border pb-2">
              {platforms.map(p => {
                const Icon = PLATFORM_ICONS[p as Platform];
                return (
                  <button
                    key={p}
                    onClick={() => setActivePlatform(p)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                      activePlatform === p
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-secondary"
                    )}
                  >
                    {Icon && <Icon size={13} />}
                    {PLATFORM_LABELS[p as Platform] ?? p}
                  </button>
                );
              })}
            </div>
          )}

          {/* Single platform header */}
          {platforms.length === 1 && (
            <div className="flex items-center gap-1.5 mb-3 text-xs text-muted-foreground">
              {(() => { const Icon = PLATFORM_ICONS[platforms[0] as Platform]; return Icon ? <Icon size={13} /> : null; })()}
              <span className="font-medium">{PLATFORM_LABELS[platforms[0] as Platform] ?? platforms[0]}</span>
            </div>
          )}

          {readOnly && analysis ? (
            <>
              <MetricsFields metrics={currentMetrics} platform={activePlatform} editable={false} />
              {analysis.analysis_text && (
                <div className="mt-4 mb-3">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1 block">Análise pós-publicação</label>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{analysis.analysis_text}</p>
                </div>
              )}
              {analysis.result && (
                <div className="mt-3">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">Resultado</label>
                  <span className={cn("px-3 py-1.5 rounded-full text-xs font-medium", resultOptions.find(o => o.value === analysis.result)?.color)}>
                    {resultOptions.find(o => o.value === analysis.result)?.label}
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              <MetricsFields metrics={currentMetrics} platform={activePlatform} editable />
              <div className="mt-4 mb-3">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1 block">Análise pós-publicação</label>
                <Textarea value={analysisText} onChange={e => setAnalysisText(e.target.value)} placeholder="Escreva sua análise sobre o desempenho deste conteúdo..." className="text-sm min-h-[80px]" />
              </div>
              <div className="mb-3">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">Resultado</label>
                <div className="flex gap-2">
                  {resultOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setResult(result === opt.value ? null : opt.value)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                        result === opt.value
                          ? cn(opt.color, "border-transparent ring-2 ring-offset-1 ring-current/20")
                          : "border-border text-muted-foreground hover:bg-secondary"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Salvando...' : analysis ? 'Atualizar análise' : 'Salvar análise'}
              </Button>
            </>
          )}
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
    setAnalyses((data as unknown as PostAnalysis[]) ?? []);
  }, [published.map(c => c.id).join(',')]);

  useEffect(() => { fetchAnalyses(); }, [fetchAnalyses]);

  const analysisMap = new Map(analyses.map(a => [a.content_id, a]));

  const analyzed = published.filter(c => analysisMap.has(c.id));
  const notAnalyzed = published.filter(c => !analysisMap.has(c.id));

  const positivos = analyzed.filter(c => analysisMap.get(c.id)?.result === 'positivo');
  const negativos = analyzed.filter(c => analysisMap.get(c.id)?.result === 'negativo');
  const neutros = analyzed.filter(c => analysisMap.get(c.id)?.result === 'neutro');
  const semResultado = analyzed.filter(c => !analysisMap.get(c.id)?.result);

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

        {tab === 'analyzed' ? (
          analyzed.length === 0 ? (
            <div className="border border-border rounded-xl bg-card flex flex-col items-center justify-center py-16 text-muted-foreground">
              <p className="text-sm">Nenhum conteúdo analisado ainda.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {([
                { label: 'Positivo', items: positivos, color: 'border-emerald-500', dot: 'bg-emerald-500' },
                { label: 'Negativo', items: negativos, color: 'border-red-500', dot: 'bg-red-500' },
                { label: 'Neutro', items: neutros, color: 'border-zinc-400', dot: 'bg-zinc-400' },
                { label: 'Sem resultado', items: semResultado, color: 'border-border', dot: 'bg-muted-foreground' },
              ] as const).filter(g => g.items.length > 0).map(group => (
                <div key={group.label}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn("w-2.5 h-2.5 rounded-full", group.dot)} />
                    <h3 className="text-sm font-semibold text-foreground">{group.label}</h3>
                    <span className="text-xs text-muted-foreground">({group.items.length})</span>
                  </div>
                  <div className={cn("border rounded-xl overflow-hidden bg-card border-l-[3px]", group.color)}>
                    <div className="grid grid-cols-[32px_1fr_140px_200px] items-center px-4 py-2 border-b border-border bg-secondary/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <div></div>
                      <div>Título</div>
                      <div>Formato</div>
                      <div>Métricas</div>
                    </div>
                    {group.items.map(content => (
                      <AnalysisRow
                        key={content.id}
                        content={content}
                        analysis={analysisMap.get(content.id) ?? null}
                        userId={user?.id ?? ''}
                        onSaved={fetchAnalyses}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="border border-border rounded-xl overflow-hidden bg-card">
            <div className="grid grid-cols-[32px_1fr_140px_200px] items-center px-4 py-2.5 border-b border-border bg-secondary/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <div></div>
              <div>Título do Conteúdo</div>
              <div>Formato</div>
              <div>Status</div>
            </div>
            {notAnalyzed.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <p className="text-sm">Todos os conteúdos publicados já foram analisados!</p>
                {published.length === 0 && <p className="text-xs mt-1">Publique conteúdos para vê-los aqui.</p>}
              </div>
            ) : (
              notAnalyzed.map(content => (
                <AnalysisRow
                  key={content.id}
                  content={content}
                  analysis={null}
                  userId={user?.id ?? ''}
                  onSaved={fetchAnalyses}
                />
              ))
            )}
          </div>
        )}

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
