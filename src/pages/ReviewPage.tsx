import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/contexts/AppContext';
import { STATUS_LABELS, STATUS_COLORS, WorkflowStatus } from '@/data/types';
import { platformIcon } from '@/components/content/PlatformIcons';
import { cn } from '@/lib/utils';
import { Eye } from 'lucide-react';
import { useClientFromUrl } from '@/hooks/useClientFromUrl';

const ReviewPage = () => {
  useClientFromUrl();
  const { projectContents, setSelectedContent } = useApp();
  const reviewContents = projectContents.filter(c => c.status === 'review');

  return (
    <>
      <TopBar title="Revisão" subtitle="Conteúdos aguardando revisão" />
      <div className="p-6">
        {reviewContents.length === 0 ? (
          <div className="text-center py-20">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'var(--client-100, hsl(var(--secondary)))' }}
            >
              <Eye size={32} style={{ color: 'var(--client-500, hsl(var(--primary)))' }} />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-1">Nada para revisar</h2>
            <p className="text-sm text-muted-foreground">Não há conteúdos aguardando revisão no momento.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviewContents.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedContent(c)}
                className="w-full bg-card border rounded-xl p-4 flex items-center gap-4 hover:shadow-sm transition-shadow text-left"
                style={{ borderColor: 'var(--client-100, hsl(var(--border)))' }}
              >
                {/* Thumbnail */}
                {c.media_urls && c.media_urls.length > 0 ? (
                  <img src={c.media_urls[0]} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <Eye size={20} className="text-muted-foreground" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {platformIcon(c.platform, 14)}
                    <span className="text-sm font-medium text-foreground">{c.title}</span>
                  </div>
                  {c.description ? (
                    <p className="text-xs text-muted-foreground truncate" dangerouslySetInnerHTML={{ __html: c.description.replace(/<[^>]*>/g, (match) => {
                      // Only allow safe inline tags, strip the rest for the list preview
                      if (/^<\/?(b|i|em|strong|u|br\s*\/?)>$/i.test(match)) return match;
                      return '';
                    }) }} />
                  ) : (
                    <p className="text-xs text-muted-foreground truncate">Sem descrição</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Por {c.assignee_profile?.display_name ?? 'N/A'} · {c.publish_date ? new Date(c.publish_date).toLocaleDateString('pt-BR') : 'Sem data'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default ReviewPage;
