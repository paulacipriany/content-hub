import { useState, useEffect, useCallback } from 'react';
import TopBar from '@/components/layout/TopBar';
import TaskListCard from '@/components/dashboard/TaskListCard';
import { useApp } from '@/contexts/AppContext';
import { useClientFromUrl } from '@/hooks/useClientFromUrl';
import { STATUS_LABELS, WorkflowStatus, PLATFORM_LABELS, Platform, CONTENT_TYPE_LABELS, ContentType, ContentWithRelations } from '@/data/types';
import {
  FileText, Calendar, GitBranch, CheckCircle, Image, BarChart3,
  TrendingUp, Clock, ArrowRight, AlertTriangle, Eye, Heart, MessageCircle, Share2,
  CalendarClock, ListTodo, Lightbulb, ClipboardList, Send, Radio,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const ClientDashboardPage = () => {
  useClientFromUrl();
  const { projectContents, selectedProject, loading } = useApp();
  const { role, user } = useAuth();
  const navigate = useNavigate();
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      supabase.from('approvals')
        .select('content_id')
        .eq('reviewer_id', user.id)
        .eq('decision', 'approved')
        .then(({ data }) => {
          if (data) setApprovedIds(new Set(data.map(d => d.content_id)));
        });
    }
  }, [user]);

  const isClient = role === 'client';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground animate-pulse">Carregando dashboard do cliente...</p>
      </div>
    );
  }

  if (!selectedProject) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-muted-foreground opacity-50" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">Cliente não encontrado</h2>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">
          Não foi possível encontrar as informações deste cliente ou você não tem permissão para acessá-las.
        </p>
        <button
          onClick={() => navigate('/')}
          className="text-sm font-medium text-primary hover:underline"
        >
          Voltar para a Home
        </button>
      </div>
    );
  }

  const basePath = `/clients/${selectedProject.id}`;

  // Counts
  const total = projectContents.length;
  const published = projectContents.filter(c => c.status === 'published').length;
  const programmed = projectContents.filter(c => c.status === 'programmed').length;
  const scheduled = projectContents.filter(c => c.status === 'scheduled').length;
  // For clients, only count those NOT yet approved by them
  const inApproval = projectContents.filter(c => c.status === 'approval-client' && (!isClient || !approvedIds.has(c.id))).length;
  const inReview = projectContents.filter(c => c.status === 'review').length;
  const inProduction = projectContents.filter(c => c.status === 'production').length;
  const ideas = projectContents.filter(c => c.status === 'idea').length;

  // Stats cards
  const stats = [
    { label: 'Total', value: total, icon: FileText, desc: 'conteúdos' },
    { label: 'Publicados', value: published, icon: CheckCircle, desc: 'finalizados' },
    { label: 'Programados', value: programmed, icon: Radio, desc: 'aguardando publicação' },
    { label: 'Agendados', value: scheduled, icon: CalendarClock, desc: 'prontos para agendar' },
    { label: 'Em Aprovação', value: inApproval, icon: Clock, desc: 'pendentes' },
    { label: 'Em Produção', value: inProduction, icon: TrendingUp, desc: 'em andamento' },
  ];

  // Alert banners
  const banners = [
    { condition: inApproval > 0, path: '/approvals', icon: AlertTriangle, count: inApproval, text: 'aguardando aprovação', style: 'bg-red-50 border-red-200 dark:bg-red-950/50 dark:border-red-800 text-red-700 dark:text-red-400' },
    ...(!isClient ? [
      { condition: inReview > 0, path: '/review', icon: AlertTriangle, count: inReview, text: 'aguardando revisão', style: 'bg-orange-50 border-orange-200 dark:bg-orange-950/50 dark:border-orange-800 text-orange-700 dark:text-orange-400' },
      { condition: scheduled > 0, path: '/scheduling', icon: CalendarClock, count: scheduled, text: 'pronto(s) para agendamento', style: 'bg-blue-50 border-blue-200 dark:bg-blue-950/50 dark:border-blue-800 text-blue-700 dark:text-blue-400' },
      { condition: programmed > 0, path: '/workflow', icon: Radio, count: programmed, text: 'programado(s)', style: 'bg-purple-50 border-purple-200 dark:bg-purple-950/50 dark:border-purple-800 text-purple-700 dark:text-purple-400' },
    ] : [])
  ].filter(b => b.condition);

  // Platform breakdown
  const clientPlatforms = ((selectedProject as any).platforms ?? ['instagram']) as Platform[];
  const platforms = clientPlatforms.map(p => ({
    platform: p,
    label: PLATFORM_LABELS[p],
    count: projectContents.filter(c => {
      const arr = Array.isArray(c.platform) ? c.platform : [c.platform];
      return arr.includes(p);
    }).length,
  })).filter(p => p.count > 0);

  // Status breakdown
  const byStatus = Object.entries(STATUS_LABELS).map(([key, label]) => ({
    status: key,
    label,
    count: projectContents.filter(c => c.status === key).length,
  })).filter(s => s.count > 0);

  // Recent contents sorted by updated_at
  const recent = [...projectContents].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 6);

  // Quick access sections
  const sections = [
    { icon: ListTodo, label: 'Tarefas', path: '/tasks', desc: 'Gestão de tarefas' },
    { icon: Calendar, label: 'Calendário', path: '/calendar', desc: 'Planejamento mensal' },
    { icon: GitBranch, label: 'Workflow', path: '/workflow', desc: 'Quadro kanban' },
    { icon: CheckCircle, label: 'Aprovações', path: '/approvals', desc: `${inApproval} pendentes` },
    { icon: CalendarClock, label: 'Agendamento', path: '/scheduling', desc: `${scheduled} agendados` },
    { icon: ClipboardList, label: 'Relatórios', path: '/post-reports', desc: 'Análise de posts' },
    { icon: Image, label: 'Biblioteca', path: '/media', desc: 'Mídias e arquivos' },
    { icon: BarChart3, label: 'Estatísticas', path: '/reports', desc: 'Métricas gerais' },
    ...(!isClient ? [{ icon: Lightbulb, label: 'Banco de Ideias', path: '/ideas', desc: 'Ideias de conteúdo' }] : []),
  ];

  return (
    <>
      <TopBar title="Dashboard" subtitle={selectedProject.name} />
      <div className="px-6 pt-4">
        <div className="flex items-center gap-1 border-b border-border">
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
              activeTab === 'overview'
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            Visão Geral
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5",
              activeTab === 'notes'
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <StickyNote size={14} /> Anotações
          </button>
        </div>
      </div>
      {activeTab === 'notes' ? (
        <div className="p-6">
          <ProjectNotes projectId={selectedProject.id} />
        </div>
      ) : (
      <div className="p-6 space-y-6">
        {/* Alert banners */}
        {banners.length > 0 && (
          <div className="space-y-2">
            {banners.map((b, i) => (
              <button
                key={i}
                onClick={() => navigate(`${basePath}${b.path}`)}
                className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors hover:opacity-90", b.style)}
              >
                <b.icon size={18} />
                <span className="text-sm font-medium">
                  {b.count} conteúdo{b.count > 1 ? 's' : ''} {b.text}
                </span>
                <ArrowRight size={14} className="ml-auto" />
              </button>
            ))}
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.map(s => (
            <div
              key={s.label}
              className="rounded-xl p-4 hover:shadow-sm transition-shadow border"
              style={{
                backgroundColor: 'var(--client-50)',
                borderColor: 'var(--client-200)',
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
                style={{ backgroundColor: 'var(--client-200)' }}
              >
                <s.icon size={16} style={{ color: 'var(--client-700)' }} />
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--client-600)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Quick access */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Acesso Rápido</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {sections.map(s => (
              <button
                key={s.path}
                onClick={() => navigate(`${basePath}${s.path}`)}
                className="rounded-xl p-4 text-left transition-all group border hover:shadow-md"
                style={{
                  backgroundColor: 'var(--client-50)',
                  borderColor: 'var(--client-100)',
                }}
              >
                <s.icon size={18} className="mb-2" style={{ color: 'var(--client-500)' }} />
                <p className="text-sm font-semibold text-foreground">{s.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{s.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Task list */}
          <TaskListCard projectId={selectedProject.id} hideDone />

          {/* Status distribution */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Distribuição por Status</h2>
            <div className="space-y-2.5">
              {byStatus.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum conteúdo ainda.</p>
              ) : (
                byStatus.map(item => (
                  <div key={item.status} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-28 flex-shrink-0 truncate">{item.label}</span>
                    <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--client-100)' }}>
                      <div
                        className="h-full rounded-full transition-all flex items-center justify-end pr-2"
                        style={{
                          width: `${total > 0 ? Math.max((item.count / total) * 100, 12) : 0}%`,
                          backgroundColor: 'var(--client-500)',
                        }}
                      >
                        <span className="text-[10px] font-medium" style={{ color: 'var(--client-500-contrast)' }}>{item.count}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Platform breakdown */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Conteúdos por Plataforma</h2>
            <div className="space-y-2.5">
              {platforms.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum conteúdo ainda.</p>
              ) : (
                platforms.map(item => (
                  <div key={item.platform} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-28 flex-shrink-0">{item.label}</span>
                    <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--client-100)' }}>
                      <div
                        className="h-full rounded-full transition-all flex items-center justify-end pr-2"
                        style={{
                          width: `${total > 0 ? Math.max((item.count / total) * 100, 12) : 0}%`,
                          backgroundColor: 'var(--client-300)',
                        }}
                      >
                        <span className="text-[10px] font-medium" style={{ color: 'var(--client-900)' }}>{item.count}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent activity */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Atividade Recente</h2>
              <button
                onClick={() => navigate(`${basePath}/contents`)}
                className="text-xs hover:underline flex items-center gap-1"
                style={{ color: 'var(--client-500)' }}
              >
                Ver todos <ArrowRight size={12} />
              </button>
            </div>
            <div className="space-y-3">
              {recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum conteúdo ainda.</p>
              ) : (
                recent.map(c => (
                  <div key={c.id} className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--client-500)' }} />
                    <span className="text-foreground font-medium truncate flex-1">{c.title}</span>
                    <span className="text-muted-foreground text-xs flex-shrink-0">{STATUS_LABELS[c.status as WorkflowStatus]}</span>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">
                      {new Date(c.updated_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Post Reports Section */}
        <PostReportsSection contents={projectContents} basePath={basePath} />
      </div>
      )}
    </>
  );
};

/* ---- Post Reports Section ---- */

interface PostAnalysisSummary {
  content_id: string;
  views: number;
  likes: number;
  comments_count: number;
  shares: number;
  analysis_text: string;
  result: string | null;
}

const resultConfig = [
  { value: 'positivo', label: 'Positivo', dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  { value: 'negativo', label: 'Negativo', dot: 'bg-red-500', badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  { value: 'neutro', label: 'Neutro', dot: 'bg-zinc-400', badge: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800/40 dark:text-zinc-300' },
];

const PostReportsSection = ({ contents, basePath }: { contents: ContentWithRelations[]; basePath: string }) => {
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<PostAnalysisSummary[]>([]);

  const published = contents.filter(c => c.status === 'published');

  const fetchAnalyses = useCallback(async () => {
    try {
      const ids = published.map(c => c.id);
      if (ids.length === 0) {
        setAnalyses([]);
        return;
      }
      const { data, error } = await supabase.from('post_analyses').select('*').in('content_id', ids);
      if (error) throw error;
      setAnalyses((data as PostAnalysisSummary[]) ?? []);
    } catch (error) {
      console.error('Error fetching post analyses:', error);
      setAnalyses([]);
    }
  }, [published.map(c => c.id).join(',')]);

  useEffect(() => { fetchAnalyses(); }, [fetchAnalyses]);

  const analysisMap = new Map(analyses.map(a => [a.content_id, a]));
  const analyzed = published.filter(c => analysisMap.has(c.id));

  if (published.length === 0) return null;

  const totalViews = analyses.reduce((s, a) => s + (a.views ?? 0), 0);
  const totalLikes = analyses.reduce((s, a) => s + (a.likes ?? 0), 0);
  const totalComments = analyses.reduce((s, a) => s + (a.comments_count ?? 0), 0);
  const totalShares = analyses.reduce((s, a) => s + (a.shares ?? 0), 0);

  const grouped = resultConfig.map(r => ({
    ...r,
    items: analyzed.filter(c => analysisMap.get(c.id)?.result === r.value),
  }));

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground">Relatório de Postagens</h2>
        <button
          onClick={() => navigate(`${basePath}/post-reports`)}
          className="text-xs hover:underline flex items-center gap-1"
          style={{ color: 'var(--client-500)' }}
        >
          Ver completo <ArrowRight size={12} />
        </button>
      </div>

      {analyses.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { icon: Eye, label: 'Visualizações', value: totalViews },
            { icon: Heart, label: 'Likes', value: totalLikes },
            { icon: MessageCircle, label: 'Comentários', value: totalComments },
            { icon: Share2, label: 'Compartilhamentos', value: totalShares },
          ].map(m => (
            <div key={m.label} className="rounded-lg p-3 border" style={{ backgroundColor: 'var(--client-50)', borderColor: 'var(--client-100)' }}>
              <m.icon size={14} className="mb-1" style={{ color: 'var(--client-500)' }} />
              <p className="text-lg font-bold text-foreground">{m.value.toLocaleString('pt-BR')}</p>
              <p className="text-[10px] text-muted-foreground">{m.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-4 mb-4">
        {grouped.map(g => (
          <div key={g.value} className="flex items-center gap-1.5">
            <div className={cn("w-2 h-2 rounded-full", g.dot)} />
            <span className="text-xs text-muted-foreground">{g.label}</span>
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", g.badge)}>{g.items.length}</span>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {analyzed.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhum conteúdo analisado ainda.</p>
        ) : (
          analyzed.slice(0, 5).map(c => {
            const a = analysisMap.get(c.id)!;
            const resultCfg = resultConfig.find(r => r.value === a.result);
            return (
              <div key={c.id} className="flex items-center gap-3 text-sm py-1.5">
                {resultCfg ? (
                  <div className={cn("w-2 h-2 rounded-full flex-shrink-0", resultCfg.dot)} />
                ) : (
                  <div className="w-2 h-2 rounded-full flex-shrink-0 bg-muted-foreground/30" />
                )}
                <span className="text-foreground font-medium truncate flex-1">{c.title}</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Eye size={11} /> {a.views}</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Heart size={11} /> {a.likes}</span>
              </div>
            );
          })
        )}
      </div>

      <p className="text-[10px] text-muted-foreground mt-3 pt-2 border-t border-border/50">
        {published.length} publicado(s) · {analyzed.length} analisado(s) · {published.length - analyzed.length} pendente(s)
      </p>
    </div>
  );
};

export default ClientDashboardPage;
