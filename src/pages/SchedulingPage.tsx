import { useState, useCallback } from 'react';
import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/contexts/AppContext';
import { useClientFromUrl } from '@/hooks/useClientFromUrl';
import { useAuth } from '@/contexts/AuthContext';
import { CONTENT_TYPE_LABELS, PLATFORM_LABELS, ContentType, Platform, ContentWithRelations } from '@/data/types';
import { platformIcon } from '@/components/content/PlatformIcons';
import { Calendar, Clock, User, Check, Download, Loader2, Copy, Instagram, Facebook, Linkedin, Youtube } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import PostPreview from '@/components/content/PostPreview';
import JSZip from 'jszip';

const platformIcons: Partial<Record<Platform, React.ElementType>> = {
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
  youtube: Youtube,
};

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
  const [checkedPlatforms, setCheckedPlatforms] = useState<Record<string, Record<string, boolean>>>({});
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
      <TopBar title="Agendamento" subtitle={`${scheduled.length} conteúdo${scheduled.length !== 1 ? 's' : ''} agendado${scheduled.length !== 1 ? 's' : ''}`} />
      <div className="p-6">
        {scheduled.length === 0 ? (
          <div className="border border-border rounded-xl bg-card flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Calendar size={32} className="mb-3 opacity-40" />
            <p className="text-sm">Nenhum conteúdo agendado no momento.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([date, items]) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar size={14} className="text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">
                    {date === 'Sem data'
                      ? 'Sem data definida'
                      : new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                  </h3>
                  <span className="text-xs text-muted-foreground">({items.length})</span>
                </div>
                <div className="border border-border rounded-xl overflow-hidden bg-card">
                  <div className="grid grid-cols-[40px_1fr_180px_200px] items-center px-4 py-2.5 border-b border-border bg-secondary/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <div></div>
                    <div>Título</div>
                    <div>Formato</div>
                    <div>Agendamento</div>
                  </div>
                  {items.map(content => {
                    const platforms = Array.isArray(content.platform) ? content.platform : [content.platform];
                    const checked = checkedPlatforms[content.id] ?? {};
                    const PlatformIcon = platforms[0] ? platformIcons[platforms[0] as Platform] : null;

                    return (
                      <div
                        key={content.id}
                        className={cn(
                          "grid grid-cols-[40px_1fr_180px_200px] items-center px-4 py-3 border-b border-border last:border-b-0 hover:bg-secondary/30 transition-all cursor-pointer",
                          exitingIds.has(content.id) && "opacity-0 scale-95 -translate-x-4 transition-all duration-500 ease-out"
                        )}
                        onClick={() => setPreviewContent(content)}
                      >
                        <div className="flex items-center justify-center">
                          {PlatformIcon && <PlatformIcon size={16} className="text-muted-foreground" />}
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-foreground truncate block">{content.title}</span>
                          {content.publish_time && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Clock size={10} /> {content.publish_time}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <span className={cn(
                            "text-xs font-medium px-2 py-0.5 rounded-md",
                            contentTypeBadgeColors[content.content_type] || 'bg-secondary text-foreground'
                          )}>
                            {CONTENT_TYPE_LABELS[content.content_type as ContentType] || content.content_type}
                          </span>
                        </div>
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          {platforms.map(p => (
                            <label key={p} className="flex items-center gap-1.5 cursor-pointer">
                              <Checkbox
                                checked={checked[p] ?? false}
                                onCheckedChange={(val) => {
                                  const updated = {
                                    ...checked,
                                    [p]: !!val,
                                  };
                                  setCheckedPlatforms(prev => ({
                                    ...prev,
                                    [content.id]: updated,
                                  }));
                                  // Check if all platforms are now checked
                                  console.log('platforms:', platforms, 'updated:', updated, 'allChecked:', platforms.every(pl => updated[pl]));
                                  const allChecked = platforms.length > 0 && platforms.every(pl => !!updated[pl]);
                                  if (allChecked) {
                                    setExitingIds(prev => new Set(prev).add(content.id));
                                    toast.success(`"${content.title}" movido para Programado`);
                                    setTimeout(() => {
                                      updateContentStatus(content.id, 'programmed');
                                      setExitingIds(prev => {
                                        const next = new Set(prev);
                                        next.delete(content.id);
                                        return next;
                                      });
                                    }, 600);
                                  }
                                }}
                              />
                              <span className={cn(
                                "text-[10px] font-medium",
                                checked[p] ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                              )}>
                                {PLATFORM_LABELS[p as Platform] ?? p}
                              </span>
                            </label>
                          ))}
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
                <SheetTitle className="text-lg font-semibold text-foreground mb-3">
                  {previewContent.title}
                </SheetTitle>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                    {CONTENT_TYPE_LABELS[previewContent.content_type as ContentType]}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                    {platformIcon(previewContent.platform, 12)}
                    {Array.isArray(previewContent.platform) ? previewContent.platform.join(', ') : previewContent.platform}
                  </span>
                </div>
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

              {previewContent.description && (
                <div className="px-6 py-4 border-b border-border/50">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Descrição</h4>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{previewContent.description.replace(/<[^>]*>/g, '')}</p>
                </div>
              )}

              <div className="px-6 py-4 flex-1">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pré-visualização</h4>
                {previewPlatform ? (
                  <PostPreview content={previewContent} platform={previewPlatform as Platform} />
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Preview não disponível</p>
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

              {/* Download images */}
              {getContentMediaUrls(previewContent).length > 0 && (
                <div className="px-6 py-4 border-t border-border/50">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={downloading}
                    onClick={() => handleDownloadZip(previewContent)}
                  >
                    {downloading ? (
                      <><Loader2 size={14} className="mr-2 animate-spin" /> Baixando...</>
                    ) : (
                      <><Download size={14} className="mr-2" /> Baixar mídias (.zip)</>
                    )}
                  </Button>
                </div>
              )}

              {/* Copy text */}
              {previewContent.copy_text && (
                <div className="px-6 py-4 border-t border-border/50">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      navigator.clipboard.writeText(previewContent.copy_text ?? '');
                      toast.success('Texto copiado!');
                    }}
                  >
                    <Copy size={14} className="mr-2" /> Copiar texto do post
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default SchedulingPage;
