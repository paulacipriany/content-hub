import { useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/contexts/AppContext';
import { useClientFromUrl } from '@/hooks/useClientFromUrl';
import { useAuth } from '@/contexts/AuthContext';
import { CONTENT_TYPE_LABELS, PLATFORM_LABELS, ContentType, Platform, ContentWithRelations } from '@/data/types';
import { platformIcon } from '@/components/content/PlatformIcons';
import { Calendar, Clock, User, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import PostPreview from '@/components/content/PostPreview';

const SchedulingPage = () => {
  useClientFromUrl();
  const { projectContents } = useApp();
  const { role } = useAuth();
  const [previewContent, setPreviewContent] = useState<ContentWithRelations | null>(null);
  const [checkedPlatforms, setCheckedPlatforms] = useState<Record<string, Record<string, boolean>>>({});

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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map(content => {
                    const platforms = Array.isArray(content.platform) ? content.platform : [content.platform];
                    const assigneeName = content.assignee_profile?.display_name ?? 'Sem responsável';

                    return (
                      <button
                        key={content.id}
                        onClick={() => setPreviewContent(content)}
                        className="w-full text-left p-4 rounded-xl bg-card border border-border hover:shadow-md transition-all group"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {platformIcon(content.platform)}
                          <span className="text-xs font-medium text-muted-foreground">
                            {CONTENT_TYPE_LABELS[content.content_type as ContentType]}
                          </span>
                          {content.publish_time && (
                            <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock size={11} />
                              {content.publish_time}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-medium text-foreground mb-1.5">{content.title}</h4>
                        {content.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                            {content.description.replace(/<[^>]*>/g, '')}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User size={11} />
                            <span>{assigneeName.split(' ')[0]}</span>
                          </div>
                          <div className="flex items-center gap-1 ml-auto">
                            {platforms.map(p => (
                              <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary">
                                {PLATFORM_LABELS[p as Platform] ?? p}
                              </span>
                            ))}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview sheet */}
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
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default SchedulingPage;
