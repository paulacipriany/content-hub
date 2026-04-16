import { useState, useCallback, useEffect } from 'react';
import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/contexts/AppContext';
import { useClientFromUrl } from '@/hooks/useClientFromUrl';
import { useAuth } from '@/contexts/AuthContext';
import { CONTENT_TYPE_LABELS, PLATFORM_LABELS, ContentType, Platform, ContentWithRelations } from '@/data/types';
import { platformIcon, PLATFORM_ICONS, PLATFORM_COLORS } from '@/components/content/PlatformIcons';
import { Calendar, Clock, User, Check, Download, Loader2, Copy, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import PostPreview from '@/components/content/PostPreview';
import JSZip from 'jszip';

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

const SchedulingPage = () => {
  useClientFromUrl();
  const { projectContents, updateContentStatus } = useApp();
  const { role } = useAuth();
  const [previewContent, setPreviewContent] = useState<ContentWithRelations | null>(null);
  const [checkedPlatforms, setCheckedPlatforms] = useState<Record<string, Record<string, boolean>>>(() => {
    try {
      const saved = localStorage.getItem('scheduling-checklist');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('scheduling-checklist', JSON.stringify(checkedPlatforms));
  }, [checkedPlatforms]);
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);

  const getContentMediaUrls = (content: ContentWithRelations): string[] => {
    const urls: string[] = [];
    if (content.media_urls && Array.isArray(content.media_urls)) {
      urls.push(...content.media_urls.filter(Boolean));
    }
    if (content.media_url && !urls.includes(content.media_url)) {
      urls.push(content.media_url);
    }
    return urls;
  };

  const handleDownloadZip = useCallback(async (content: ContentWithRelations) => {
    const urls = getContentMediaUrls(content);
    if (urls.length === 0) return;

    setDownloading(true);
    try {
      const zip = new JSZip();
      await Promise.all(urls.map(async (url, i) => {
        const res = await fetch(url);
        const blob = await res.blob();
        const ext = url.split('.').pop()?.split('?')[0] || 'jpg';
        const name = `${content.title.replace(/[^a-zA-Z0-9]/g, '_')}_${i + 1}.${ext}`;
        zip.file(name, blob);
      }));
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(zipBlob);
      a.download = `${content.title.replace(/[^a-zA-Z0-9]/g, '_')}_midias.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      console.error('Erro ao baixar mídias:', e);
    } finally {
      setDownloading(false);
    }
  }, []);

  const scheduled = projectContents
    .filter(c => c.status === 'scheduled')
    .sort((a, b) => {
      const dateA = a.publish_date ?? '';
      const dateB = b.publish_date ?? '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return (a.publish_time ?? '').localeCompare(b.publish_time ?? '');
    });

  // Group by date
  const grouped = scheduled.reduce<Record<string, ContentWithRelations[]>>((acc, c) => {
    const key = c.publish_date ?? 'Sem data';
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  const previewPlatform = previewContent?.platform
    ? (Array.isArray(previewContent.platform) ? previewContent.platform[0] : previewContent.platform)
    : null;

  return (
    <>
      <TopBar title="Agendamento" subtitle={`${scheduled.length} conteúdo${scheduled.length !== 1 ? 's' : ''} para agendar`} />
      <div className="p-6">
        {scheduled.length === 0 ? (
          <div className="text-center py-20">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'var(--client-100, hsl(var(--secondary)))' }}
            >
              <Calendar size={32} style={{ color: 'var(--client-500, hsl(var(--primary)))' }} />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-1">Tudo programado!</h2>
            <p className="text-sm text-muted-foreground">Nenhum conteúdo para agendar no momento.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([date, items]) => (
              <div key={date}>
                <div className="space-y-3">
                  {items.map(content => {
                    const platforms = Array.isArray(content.platform) ? content.platform : [content.platform];
                    return (
                      <div
                        key={content.id}
                        className={cn(
                          "border rounded-xl p-4 flex items-center gap-4 hover:shadow-sm transition-all cursor-pointer",
                          exitingIds.has(content.id) && "opacity-0 scale-95 -translate-x-4 transition-all duration-500 ease-out"
                        )}
                        style={{ backgroundColor: 'rgba(215, 255, 115, 0.3)', borderColor: '#000000', borderWidth: '2px' }}
                        onClick={() => setPreviewContent(content)}
                      >
                        {/* Thumbnail */}
                        {content.media_urls && content.media_urls.length > 0 ? (
                          <img src={content.media_urls[0]} alt="" className="w-24 h-24 rounded-lg object-cover flex-shrink-0" />
                        ) : content.media_url ? (
                          <img src={content.media_url} alt="" className="w-24 h-24 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            <Calendar size={24} className="text-muted-foreground" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-2 border border-border" style={{ backgroundColor: '#ffffff', color: '#000000' }}>
                            <Clock size={13} />
                            {content.publish_date ? new Date(content.publish_date).toLocaleDateString('pt-BR') : 'Sem data'}{content.publish_time ? ` às ${content.publish_time}` : ''}
                          </span>
                          <div className="flex items-center gap-1.5 mb-1">
                            {platformIcon(platforms as Platform[], 14, true)}
                          </div>
                          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium mb-1 uppercase" style={{ backgroundColor: '#ff88db', color: '#000000', borderRadius: '5px' }}>
                            {CONTENT_TYPE_LABELS[content.content_type as ContentType] ?? content.content_type}
                          </span>
                          <span className="text-sm font-medium text-foreground block">{content.title}</span>
                        </div>
                        <div className="flex-shrink-0">
                          <Button
                            size="sm"
                            className="gap-1.5 text-xs font-semibold border-0"
                            style={{ backgroundColor: '#c5daf7', color: '#1369db' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewContent(content);
                            }}
                          >
                            <Eye size={14} /> Visualizar
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview sheet — full content details */}
      <Sheet open={!!previewContent} onOpenChange={(open) => { if (!open) setPreviewContent(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
          {previewContent && (
            <div className="flex flex-col h-full">
              <div className="px-6 pt-6 pb-4 border-b border-border">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                    {CONTENT_TYPE_LABELS[previewContent.content_type as ContentType]}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    {platformIcon(previewContent.platform, 14, true)}
                  </span>
                </div>
                <SheetTitle className="text-lg font-semibold text-foreground">
                  {previewContent.title}
                </SheetTitle>
              </div>

              <div className="px-6 py-3 border-b border-border/50 flex flex-wrap gap-4 text-xs text-muted-foreground">
                {previewContent.publish_date && (
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} />
                    <span>
                      {new Date(previewContent.publish_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      {previewContent.publish_time && ` às ${previewContent.publish_time}`}
                    </span>
                  </div>
                )}
                {previewContent.assignee_profile && (
                  <div className="flex items-center gap-1.5">
                    <User size={12} />
                    <span>{previewContent.assignee_profile.display_name}</span>
                  </div>
                )}
              </div>



              <div className="px-6 py-4 flex-1">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pré-visualização</h4>
                {previewPlatform ? (
                  <PostPreview content={previewContent} platform={previewPlatform as Platform} compact />
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Preview não disponível</p>
                )}

                {/* Action buttons right below preview */}
                {(previewContent.copy_text || getContentMediaUrls(previewContent).length > 0) && (
                  <div className="flex gap-2 mt-3 w-full">
                    {previewContent.copy_text && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1.5 border-0"
                        style={{ backgroundColor: '#c5daf7', color: '#1369db' }}
                        onClick={() => {
                          navigator.clipboard.writeText(previewContent.copy_text ?? '');
                          toast.success('Texto copiado!');
                        }}
                      >
                        <Copy size={14} /> Copiar texto
                      </Button>
                    )}
                    {getContentMediaUrls(previewContent).length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1.5 border-0"
                        style={{ backgroundColor: '#c5daf7', color: '#1369db' }}
                        disabled={downloading}
                        onClick={() => handleDownloadZip(previewContent)}
                      >
                        {downloading ? (
                          <><Loader2 size={14} className="animate-spin" /> Baixando...</>
                        ) : (
                          <><Download size={14} /> Baixar mídias</>
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {previewContent.hashtags && previewContent.hashtags.length > 0 && (
                <div className="px-6 py-3 border-t border-border/50">
                  <div className="flex flex-wrap gap-1.5">
                    {previewContent.hashtags.map((tag, i) => (
                      <span key={i} className="text-xs text-primary font-medium">#{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Platform checklist — hidden for client users */}
              {role !== 'client' && (() => {
                const platforms = Array.isArray(previewContent.platform) ? previewContent.platform : [previewContent.platform];
                const checked = checkedPlatforms[previewContent.id] ?? {};
                return (
                  <div className="px-6 py-4 border-t border-border/50">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Checklist de agendamento</h4>
                    <div className="space-y-2.5">
                      {platforms.map(p => {
                        const Icon = PLATFORM_ICONS[p];
                        return (
                          <label key={p} className="flex items-center gap-2.5 cursor-pointer group">
                            <Checkbox
                              checked={checked[p] ?? false}
                              onCheckedChange={(val) => {
                                const updated = { ...checked, [p]: !!val };
                                setCheckedPlatforms(prev => ({ ...prev, [previewContent.id]: updated }));
                                const allChecked = platforms.length > 0 && platforms.every(pl => !!updated[pl]);
                                if (allChecked) {
                                  setExitingIds(prev => new Set(prev).add(previewContent.id));
                                  toast.success(`"${previewContent.title}" movido para Programado`);
                                  setPreviewContent(null);
                                  setTimeout(() => {
                                    updateContentStatus(previewContent.id, 'programmed');
                                    setExitingIds(prev => {
                                      const next = new Set(prev);
                                      next.delete(previewContent.id);
                                      return next;
                                    });
                                  }, 600);
                                }
                              }}
                            />
                            {Icon && <span className={cn(checked[p] ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}><Icon size={14} /></span>}
                            <span className={cn(
                              "text-sm font-medium transition-colors",
                              checked[p] ? "text-emerald-600 dark:text-emerald-400 line-through" : "text-foreground"
                            )}>
                              {PLATFORM_LABELS[p as Platform] ?? p}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default SchedulingPage;
