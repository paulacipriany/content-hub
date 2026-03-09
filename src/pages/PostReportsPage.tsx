import { useState, useEffect, useCallback, useMemo } from 'react';
import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useClientFromUrl } from '@/hooks/useClientFromUrl';
import { CONTENT_TYPE_LABELS, PLATFORM_LABELS, ContentType, Platform, ContentWithRelations } from '@/data/types';
import { platformIcon, PLATFORM_ICONS } from '@/components/content/PlatformIcons';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Eye, Heart, MessageCircle, Share2, FileText, Repeat2, Bookmark, Activity, UserCheck, Users, UserPlus, Target, ChevronDown, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';

type AnalysisResult = 'positivo' | 'negativo' | 'neutro';

interface PlatformMetrics {
  views: number;
  likes: number;
  comments_count: number;
  shares: number;
  reposts?: number;
  saves?: number;
  interactions?: number;
  interactions_followers?: number;
  interactions_non_followers?: number;
  profile_activity?: number;
  views_followers?: number;
  views_non_followers?: number;
  accounts_reached?: number;
  views_source_profile?: number;
  views_source_feed?: number;
  views_source_stories?: number;
  link_clicks?: number;
  profile_visits?: number;
  followers_gained?: number;
  gender_men?: number;
  gender_women?: number;
  gender_unidentified?: number;
  replies?: number;
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

/* ── Collapsible Section ── */
const CollapsibleSection = ({ label, children, open, onToggle }: { label: string; children: React.ReactNode; open: boolean; onToggle: () => void }) => {
  return (
    <div className="border border-border/50 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 bg-secondary/30 hover:bg-secondary/50 transition-colors"
      >
        <h5 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</h5>
        {open ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
};

/* ── Metric Field ── */
const MetricField = ({ icon, label, value, onChange }: { icon: React.ReactNode; label: string; value: number; onChange: (v: number) => void }) => (
  <div>
    <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1 mb-1">{icon} {label}</label>
    <Input type="text" value={value ?? 0} onChange={e => onChange(Number(e.target.value) || 0)} className="h-8 text-sm" />
  </div>
);

/* ── Percentage Field ── */
const PercentageField = ({ icon, label, value, onChange }: { icon: React.ReactNode; label: string; value: number; onChange: (v: number) => void }) => {
  const numToStr = (n: number) => (n === 0 ? '0' : n.toString().replace('.', ','));

  const [localValue, setLocalValue] = useState(numToStr(value ?? 0));
  const [focused, setFocused] = useState(false);

  // Sync from outside only when not focused
  useEffect(() => {
    if (!focused) setLocalValue(numToStr(value ?? 0));
  }, [value, focused]);

  const handleChange = (raw: string) => {
    // Allow digits and a single comma
    const cleaned = raw.replace(/[^\d,]/g, '');
    // Prevent multiple commas
    const parts = cleaned.split(',');
    const safe = parts.length > 2 ? parts[0] + ',' + parts.slice(1).join('') : cleaned;
    setLocalValue(safe);
    const num = parseFloat(safe.replace(',', '.')) || 0;
    onChange(num);
  };

  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1 mb-1">{icon} {label}</label>
      <div className="relative">
        <Input
          type="text"
          value={localValue}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="h-8 text-sm pr-6"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
      </div>
    </div>
  );
};

/* ── Detail Sheet ── */
const AnalysisSheet = ({
  content,
  analysis,
  userId,
  onSaved,
  onClose,
}: {
  content: ContentWithRelations;
  analysis: PostAnalysis | null;
  userId: string;
  onSaved: () => void;
  onClose: () => void;
}) => {
  const platforms = Array.isArray(content.platform) ? content.platform : [content.platform];

  const initMetrics = (p: string): PlatformMetrics => {
    const saved = analysis?.platform_metrics?.[p];
    return saved ?? { views: 0, likes: 0, comments_count: 0, shares: 0 };
  };

  const initialPlatformMetrics = useMemo(() => {
    const m: Record<string, PlatformMetrics> = {};
    platforms.forEach((p) => {
      m[p] = initMetrics(p);
    });
    return m;
  }, [platforms, analysis?.platform_metrics]);

  const initialAnalysisText = analysis?.analysis_text ?? '';
  const initialResult = analysis?.result ?? null;

  const [platformMetrics, setPlatformMetrics] = useState<Record<string, PlatformMetrics>>(initialPlatformMetrics);
  const [activePlatform, setActivePlatform] = useState(platforms[0]);
  const [activeSection, setActiveSection] = useState<string>('Principais');
  const [analysisText, setAnalysisText] = useState(initialAnalysisText);
  const [result, setResult] = useState<AnalysisResult | null>(initialResult);
  const [saving, setSaving] = useState(false);
  const [confirmExitOpen, setConfirmExitOpen] = useState(false);

  const hasUnsavedChanges = useMemo(() => {
    return (
      JSON.stringify(platformMetrics) !== JSON.stringify(initialPlatformMetrics) ||
      analysisText !== initialAnalysisText ||
      result !== initialResult
    );
  }, [platformMetrics, initialPlatformMetrics, analysisText, initialAnalysisText, result, initialResult]);

  const updateMetric = (platform: string, field: keyof PlatformMetrics, value: number) => {
    setPlatformMetrics(prev => ({
      ...prev,
      [platform]: { ...prev[platform], [field]: value },
    }));
  };

  const totals = Object.values(platformMetrics).reduce(
    (acc, m) => ({
      views: acc.views + m.views,
      likes: acc.likes + m.likes,
      comments_count: acc.comments_count + m.comments_count,
      shares: acc.shares + m.shares,
    }),
    { views: 0, likes: 0, comments_count: 0, shares: 0 }
  );

  const handleSave = async (closeAfterSave = false) => {
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

    if (closeAfterSave) {
      onClose();
    }
  };

  const handleCloseAttempt = () => {
    if (saving) return;

    if (hasUnsavedChanges) {
      setConfirmExitOpen(true);
      return;
    }

    onClose();
  };

  const currentMetrics = platformMetrics[activePlatform] ?? { views: 0, likes: 0, comments_count: 0, shares: 0 };

  const isInstagram = activePlatform === 'instagram';
  const isFacebook = activePlatform === 'facebook';
  const isYoutube = activePlatform === 'youtube';

  return (
    <>
      <Sheet open onOpenChange={(open) => { if (!open) handleCloseAttempt(); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-border">
            <SheetTitle className="text-lg font-semibold text-foreground mb-2">{content.title}</SheetTitle>
            <div className="flex flex-wrap gap-2">
              <span className={cn(
                "text-xs font-medium px-2.5 py-1 rounded-full",
                contentTypeBadgeColors[content.content_type] || 'bg-secondary text-foreground'
              )}>
                {CONTENT_TYPE_LABELS[content.content_type as ContentType] || content.content_type}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                {platformIcon(content.platform, 12)}
                {Array.isArray(content.platform) ? content.platform.map(p => PLATFORM_LABELS[p as Platform] ?? p).join(', ') : PLATFORM_LABELS[content.platform as Platform]}
              </span>
              {analysis?.result && (
                <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", resultOptions.find(o => o.value === analysis.result)?.color)}>
                  {resultOptions.find(o => o.value === analysis.result)?.label}
                </span>
              )}
            </div>
          </div>

          {/* Platform tabs */}
          {platforms.length > 1 && (
            <div className="px-6 pt-3 flex items-center gap-1 border-b border-border pb-3">
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
            <div className="px-6 pt-3 pb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              {(() => { const Icon = PLATFORM_ICONS[platforms[0] as Platform]; return Icon ? <Icon size={13} /> : null; })()}
              <span className="font-medium">{PLATFORM_LABELS[platforms[0] as Platform] ?? platforms[0]}</span>
            </div>
          )}

          {/* Metrics */}
          <div className="px-6 py-4 flex-1 overflow-y-auto space-y-2">
            {isInstagram ? (
              <>
                {([
                  {
                    label: 'Principais',
                    fields: [
                      { icon: <Heart size={11} />, label: 'Likes', field: 'likes' as keyof PlatformMetrics },
                      { icon: <MessageCircle size={11} />, label: 'Comentários', field: 'comments_count' as keyof PlatformMetrics },
                      { icon: <Share2 size={11} />, label: 'Compartilhamentos', field: 'shares' as keyof PlatformMetrics },
                      { icon: <Repeat2 size={11} />, label: 'Reposts', field: 'reposts' as keyof PlatformMetrics },
                      { icon: <Bookmark size={11} />, label: 'Salvos', field: 'saves' as keyof PlatformMetrics },
                      { icon: <UserCheck size={11} />, label: 'Atividades do perfil', field: 'profile_activity' as keyof PlatformMetrics },
                    ],
                  },
                  {
                    label: 'Geral',
                    fields: [
                      { icon: <Target size={11} />, label: 'Contas alcançadas', field: 'accounts_reached' as keyof PlatformMetrics },
                      { icon: <Eye size={11} />, label: 'Visualizações', field: 'views' as keyof PlatformMetrics },
                      { icon: <Users size={11} />, label: 'Visualizações seguidores', field: 'views_followers' as keyof PlatformMetrics, pct: true },
                      { icon: <UserPlus size={11} />, label: 'Visualizações não seguidores', field: 'views_non_followers' as keyof PlatformMetrics, pct: true },
                    ],
                  },
                  {
                    label: 'Interações',
                    fields: [
                      { icon: <Activity size={11} />, label: 'Interações', field: 'interactions' as keyof PlatformMetrics },
                      { icon: <Users size={11} />, label: 'Seguidores', field: 'interactions_followers' as keyof PlatformMetrics, pct: true },
                      { icon: <UserPlus size={11} />, label: 'Não seguidores', field: 'interactions_non_followers' as keyof PlatformMetrics, pct: true },
                    ],
                  },
                  {
                    label: 'Fonte de visualizações',
                    fields: [
                      { icon: <UserCheck size={11} />, label: 'Perfil', field: 'views_source_profile' as keyof PlatformMetrics, pct: true },
                      { icon: <FileText size={11} />, label: 'Feed', field: 'views_source_feed' as keyof PlatformMetrics, pct: true },
                      { icon: <Eye size={11} />, label: 'Stories', field: 'views_source_stories' as keyof PlatformMetrics, pct: true },
                    ],
                  },
                  {
                    label: 'Atividade do perfil',
                    fields: [
                      { icon: <Activity size={11} />, label: 'Cliques em links', field: 'link_clicks' as keyof PlatformMetrics },
                      { icon: <UserCheck size={11} />, label: 'Visitas ao perfil', field: 'profile_visits' as keyof PlatformMetrics },
                      { icon: <UserPlus size={11} />, label: 'Seguidores', field: 'followers_gained' as keyof PlatformMetrics },
                    ],
                  },
                  {
                    label: 'Gênero público',
                    fields: [
                      { icon: <Users size={11} />, label: 'Homens', field: 'gender_men' as keyof PlatformMetrics, pct: true },
                      { icon: <Users size={11} />, label: 'Mulheres', field: 'gender_women' as keyof PlatformMetrics, pct: true },
                      { icon: <Users size={11} />, label: 'Não identificado', field: 'gender_unidentified' as keyof PlatformMetrics, pct: true },
                    ],
                  },
                ] as { label: string; fields: { icon: React.ReactNode; label: string; field: keyof PlatformMetrics; pct?: boolean }[] }[]).map(section => (
                  <CollapsibleSection
                    key={section.label}
                    label={section.label}
                    open={activeSection === section.label}
                    onToggle={() => setActiveSection(activeSection === section.label ? '' : section.label)}
                  >
                    <div className="grid grid-cols-2 gap-3 pt-3">
                      {section.fields.map(f => (
                        f.pct ? (
                          <PercentageField
                            key={f.field}
                            icon={f.icon}
                            label={f.label}
                            value={currentMetrics[f.field] ?? 0}
                            onChange={(v) => updateMetric(activePlatform, f.field, v)}
                          />
                        ) : (
                          <MetricField
                            key={f.field}
                            icon={f.icon}
                            label={f.label}
                            value={currentMetrics[f.field] ?? 0}
                            onChange={(v) => updateMetric(activePlatform, f.field, v)}
                          />
                        )
                      ))}
                    </div>
                  </CollapsibleSection>
                ))}
              </>
            ) : isFacebook ? (
              <div className="grid grid-cols-2 gap-3">
                <MetricField icon={<Target size={11} />} label="Alcance" value={currentMetrics.accounts_reached ?? 0} onChange={(v) => updateMetric(activePlatform, 'accounts_reached', v)} />
                <MetricField icon={<Eye size={11} />} label="Visualizações" value={currentMetrics.views ?? 0} onChange={(v) => updateMetric(activePlatform, 'views', v)} />
                <MetricField icon={<Activity size={11} />} label="Interações" value={currentMetrics.interactions ?? 0} onChange={(v) => updateMetric(activePlatform, 'interactions', v)} />
                <MetricField icon={<Heart size={11} />} label="Likes" value={currentMetrics.likes ?? 0} onChange={(v) => updateMetric(activePlatform, 'likes', v)} />
                <MetricField icon={<MessageCircle size={11} />} label="Comentários" value={currentMetrics.comments_count ?? 0} onChange={(v) => updateMetric(activePlatform, 'comments_count', v)} />
                <MetricField icon={<Share2 size={11} />} label="Compartilhamentos" value={currentMetrics.shares ?? 0} onChange={(v) => updateMetric(activePlatform, 'shares', v)} />
                <MetricField icon={<Bookmark size={11} />} label="Salvos" value={currentMetrics.saves ?? 0} onChange={(v) => updateMetric(activePlatform, 'saves', v)} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <MetricField icon={<Eye size={11} />} label="Visualizações" value={currentMetrics.views ?? 0} onChange={(v) => updateMetric(activePlatform, 'views', v)} />
                <MetricField icon={<Heart size={11} />} label="Likes" value={currentMetrics.likes ?? 0} onChange={(v) => updateMetric(activePlatform, 'likes', v)} />
                <MetricField icon={<MessageCircle size={11} />} label="Comentários" value={currentMetrics.comments_count ?? 0} onChange={(v) => updateMetric(activePlatform, 'comments_count', v)} />
                <MetricField icon={<Share2 size={11} />} label="Compartilhamentos" value={currentMetrics.shares ?? 0} onChange={(v) => updateMetric(activePlatform, 'shares', v)} />
              </div>
            )}

            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1 block">Análise pós-publicação</label>
              <Textarea value={analysisText} onChange={e => setAnalysisText(e.target.value)} placeholder="Escreva sua análise sobre o desempenho deste conteúdo..." className="text-sm min-h-[80px]" />
            </div>

            <div>
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
          </div>

          {/* Save button */}
          <div className="px-6 py-3 border-t border-border">
            <Button className="w-full" onClick={() => handleSave()} disabled={saving}>
              {saving ? 'Salvando...' : analysis ? 'Atualizar análise' : 'Salvar análise'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>

    <AlertDialog open={confirmExitOpen} onOpenChange={setConfirmExitOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Salvar antes de sair?</AlertDialogTitle>
          <AlertDialogDescription>
            Você fez alterações neste relatório. Deseja salvar antes de fechar?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Continuar editando</AlertDialogCancel>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setConfirmExitOpen(false);
              onClose();
            }}
          >
            Sair sem salvar
          </Button>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              setConfirmExitOpen(false);
              handleSave(true);
            }}
          >
            Salvar e sair
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
};

/* ── List Row ── */
const AnalysisListRow = ({
  content,
  analysis,
  onClick,
}: {
  content: ContentWithRelations;
  analysis: PostAnalysis | null;
  onClick: () => void;
}) => {
  return (
    <div
      onClick={onClick}
      className="grid grid-cols-[1fr_140px_200px] items-center px-4 py-3 hover:bg-secondary/30 transition-colors cursor-pointer border-b border-border last:border-b-0"
    >
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
  );
};

/* ── Page ── */
const PostReportsPage = () => {
  useClientFromUrl();
  const { projectContents } = useApp();
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<PostAnalysis[]>([]);
  const [tab, setTab] = useState<Tab>('not-analyzed');
  const [selectedContent, setSelectedContent] = useState<ContentWithRelations | null>(null);

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
                    <div className="grid grid-cols-[1fr_140px_200px] items-center px-4 py-2 border-b border-border bg-secondary/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <div>Título</div>
                      <div>Formato</div>
                      <div>Métricas</div>
                    </div>
                    {group.items.map(content => (
                      <AnalysisListRow
                        key={content.id}
                        content={content}
                        analysis={analysisMap.get(content.id) ?? null}
                        onClick={() => setSelectedContent(content)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="border border-border rounded-xl overflow-hidden bg-card">
            <div className="grid grid-cols-[1fr_140px_200px] items-center px-4 py-2.5 border-b border-border bg-secondary/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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
                <AnalysisListRow
                  key={content.id}
                  content={content}
                  analysis={null}
                  onClick={() => setSelectedContent(content)}
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

      {/* Detail Sheet */}
      {selectedContent && (
        <AnalysisSheet
          content={selectedContent}
          analysis={analysisMap.get(selectedContent.id) ?? null}
          userId={user?.id ?? ''}
          onSaved={() => { fetchAnalyses(); }}
          onClose={() => setSelectedContent(null)}
        />
      )}
    </>
  );
};

export default PostReportsPage;
