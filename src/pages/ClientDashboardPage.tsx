import { useState, useEffect, useCallback } from 'react';
import TopBar from '@/components/layout/TopBar';
import TaskListCard from '@/components/dashboard/TaskListCard';
import { useApp } from '@/contexts/AppContext';
import { useClientFromUrl } from '@/hooks/useClientFromUrl';
import { STATUS_LABELS, WorkflowStatus, PLATFORM_LABELS, Platform, CONTENT_TYPE_LABELS, ContentType, ContentWithRelations } from '@/data/types';
import {
  FileText, Calendar, GitBranch, CheckCircle, Image, BarChart3,
  TrendingUp, Clock, ArrowRight, AlertTriangle, Eye, Heart, MessageCircle, Share2, ChevronDown, ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

const ClientDashboardPage = () => {
  useClientFromUrl();
  const { projectContents, selectedProject } = useApp();
  const navigate = useNavigate();

  if (!selectedProject) return null;

  const basePath = `/clients/${selectedProject.id}`;

  const total = projectContents.length;
  const published = projectContents.filter(c => c.status === 'published').length;
  const inApproval = projectContents.filter(c => c.status.startsWith('approval')).length;
  const inReview = projectContents.filter(c => c.status === 'review').length;
  const inProduction = projectContents.filter(c => c.status === 'production').length;
  const scheduled = projectContents.filter(c => c.status === 'scheduled').length;

  const stats = [
    { label: 'Total', value: total, icon: FileText },
    { label: 'Publicados', value: published, icon: CheckCircle },
    { label: 'Em Aprovação', value: inApproval, icon: Clock },
    { label: 'Em Produção', value: inProduction, icon: TrendingUp },
  ];

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

  // Recent contents
  const recent = projectContents.slice(0, 5);

  // Quick access sections
  const sections = [
    { icon: FileText, label: 'Conteúdos', path: '/contents', desc: `${total} conteúdos` },
    { icon: Calendar, label: 'Calendário', path: '/calendar', desc: 'Planejamento mensal' },
    { icon: GitBranch, label: 'Workflow', path: '/workflow', desc: 'Quadro kanban' },
    { icon: CheckCircle, label: 'Aprovações', path: '/approvals', desc: `${inApproval} pendentes` },
    { icon: Image, label: 'Biblioteca', path: '/media', desc: 'Mídia e templates' },
    { icon: BarChart3, label: 'Relatórios', path: '/reports', desc: 'Métricas' },
  ];

  return (
    <>
      <TopBar title="Dashboard" subtitle={selectedProject.name} />
      <div className="p-6 space-y-6">
        {/* Alert banners for review & approval */}
        {inReview > 0 && (
          <button
            onClick={() => navigate(`${basePath}/review`)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors hover:opacity-90"
            style={{ backgroundColor: '#fff3e0', borderColor: '#ffe0b2' }}
          >
            <AlertTriangle size={18} style={{ color: '#e65100' }} />
            <span className="text-sm font-medium" style={{ color: '#e65100' }}>
              {inReview} conteúdo{inReview > 1 ? 's' : ''} aguardando revisão
            </span>
            <ArrowRight size={14} className="ml-auto" style={{ color: '#e65100' }} />
          </button>
        )}
        {inApproval > 0 && (
          <button
            onClick={() => navigate(`${basePath}/approvals`)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors hover:opacity-90"
            style={{ backgroundColor: '#fce4ec', borderColor: '#f8bbd0' }}
          >
            <AlertTriangle size={18} style={{ color: '#c62828' }} />
            <span className="text-sm font-medium" style={{ color: '#c62828' }}>
              {inApproval} conteúdo{inApproval > 1 ? 's' : ''} aguardando aprovação
            </span>
            <ArrowRight size={14} className="ml-auto" style={{ color: '#c62828' }} />
          </button>
        )}
        {/* Stats — client palette accent */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(s => (
            <div
              key={s.label}
              className="rounded-xl p-4 hover:shadow-sm transition-shadow border"
              style={{ backgroundColor: 'var(--client-50)', borderColor: 'var(--client-200)' }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                style={{ backgroundColor: 'var(--client-200)' }}
              >
                <s.icon size={18} style={{ color: 'var(--client-700)' }} />
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--client-600)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Quick access — palette-tinted cards */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Acesso Rápido</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
                <s.icon size={20} className="mb-2" style={{ color: 'var(--client-500)' }} />
                <p className="text-sm font-semibold text-foreground transition-colors" style={{ '--hover-color': 'var(--client-600)' } as React.CSSProperties}>{s.label}</p>
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
                  <span className="text-foreground font-medium truncate">{c.title}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-muted-foreground text-xs">{STATUS_LABELS[c.status as WorkflowStatus]}</span>
                  <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
                    {new Date(c.updated_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Post Reports Section */}
        <PostReportsSection contents={projectContents} basePath={basePath} />
      </div>
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
    const ids = published.map(c => c.id);
    if (ids.length === 0) { setAnalyses([]); return; }
    const { data } = await supabase.from('post_analyses').select('*').in('content_id', ids);
    setAnalyses((data as PostAnalysisSummary[]) ?? []);
  }, [published.map(c => c.id).join(',')]);

  useEffect(() => { fetchAnalyses(); }, [fetchAnalyses]);

  const analysisMap = new Map(analyses.map(a => [a.content_id, a]));
  const analyzed = published.filter(c => analysisMap.has(c.id));

  if (published.length === 0) return null;

  // Totals
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

      {/* Aggregate metrics */}
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

      {/* Result distribution */}
      <div className="flex items-center gap-4 mb-4">
        {grouped.map(g => (
          <div key={g.value} className="flex items-center gap-1.5">
            <div className={cn("w-2 h-2 rounded-full", g.dot)} />
            <span className="text-xs text-muted-foreground">{g.label}</span>
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", g.badge)}>{g.items.length}</span>
          </div>
        ))}
      </div>

      {/* Analyzed posts list (latest 5) */}
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

      {/* Footer summary */}
      <p className="text-[10px] text-muted-foreground mt-3 pt-2 border-t border-border/50">
        {published.length} publicado(s) · {analyzed.length} analisado(s) · {published.length - analyzed.length} pendente(s)
      </p>
    </div>
  );
};

export default ClientDashboardPage;
