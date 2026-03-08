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
                <div className="space-y-2">
                  {items.map(content => {
                    const platforms = Array.isArray(content.platform) ? content.platform : [content.platform];
                    const assigneeName = content.assignee_profile?.display_name ?? 'Sem responsável';
                    const checked = checkedPlatforms[content.id] ?? {};
                    const checkedCount = Object.values(checked).filter(Boolean).length;

                    return (
                      <button
                        key={content.id}
                        onClick={() => setPreviewContent(content)}
                        className="w-full text-left px-4 py-3 rounded-lg bg-card border border-border hover:shadow-sm transition-all flex items-center gap-4"
                      >
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {platformIcon(content.platform)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-foreground truncate">{content.title}</h4>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                            <span>{CONTENT_TYPE_LABELS[content.content_type as ContentType]}</span>
                            <span className="flex items-center gap-1"><User size={10} /> {assigneeName.split(' ')[0]}</span>
                          </div>
                        </div>
                        {content.publish_time && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                            <Clock size={11} />
                            {content.publish_time}
                          </span>
                        )}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {platforms.map(p => (
                            <span
                              key={p}
                              className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded",
                                checked[p] ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-secondary text-muted-foreground"
                              )}
                            >
                              {PLATFORM_LABELS[p as Platform] ?? p}
                            </span>
                          ))}
                        </div>
                        {platforms.length > 0 && (
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">
                            {checkedCount}/{platforms.length}
                          </span>
                        )}
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

              {/* Platform checklist */}
              {(() => {
                const platforms = Array.isArray(previewContent.platform) ? previewContent.platform : [previewContent.platform];
                if (platforms.length === 0) return null;
                return (
                  <div className="px-6 py-4 border-b border-border/50">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Redes Sociais</h4>
                    <div className="space-y-2.5">
                      {platforms.map(p => (
                        <label key={p} className="flex items-center gap-3 cursor-pointer group">
                          <Checkbox
                            checked={checkedPlatforms[previewContent.id]?.[p] ?? false}
                            onCheckedChange={(checked) => {
                              setCheckedPlatforms(prev => ({
                                ...prev,
                                [previewContent.id]: {
                                  ...prev[previewContent.id],
                                  [p]: !!checked,
                                },
                              }));
                            }}
                          />
                          <div className="flex items-center gap-2">
                            {platformIcon([p] as Platform[], 14)}
                            <span className="text-sm text-foreground">{PLATFORM_LABELS[p as Platform] ?? p}</span>
                          </div>
                          {checkedPlatforms[previewContent.id]?.[p] && (
                            <Check size={14} className="ml-auto text-emerald-500" />
                          )}
                        </label>
                      ))}
                    </div>
                    {platforms.length > 1 && (
                      <p className="text-[10px] text-muted-foreground mt-2">
                        {Object.values(checkedPlatforms[previewContent.id] ?? {}).filter(Boolean).length} de {platforms.length} agendada(s)
                      </p>
                    )}
                  </div>
                );
              })()}

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
