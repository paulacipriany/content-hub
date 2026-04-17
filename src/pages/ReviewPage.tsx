import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { STATUS_LABELS, STATUS_COLORS, WorkflowStatus, CONTENT_TYPE_LABELS, ContentType, Platform } from '@/data/types';
import { platformIcon } from '@/components/content/PlatformIcons';
import { cn } from '@/lib/utils';
import { Eye, Pencil, Clock, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useClientFromUrl } from '@/hooks/useClientFromUrl';

const ReviewPage = () => {
  useClientFromUrl();
  const { projectContents, setSelectedContent, updateContentStatus } = useApp();
  const { role } = useAuth();
  const isClient = role === 'client';
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
              <div
                key={c.id}
                className="border rounded-xl p-4 flex items-center gap-4 hover:shadow-sm transition-shadow"
                style={{ backgroundColor: '#eaf2fc', borderColor: '#000000', borderWidth: '2px' }}
              >
                {/* Thumbnail */}
                {c.media_urls && c.media_urls.length > 0 ? (
                  <img src={c.media_urls[0]} alt="" className="w-24 h-24 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <Eye size={24} className="text-muted-foreground" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-2" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
                    <Clock size={13} />
                    {c.publish_date ? new Date(c.publish_date).toLocaleDateString('pt-BR') : 'Sem data'}{c.publish_time ? ` às ${c.publish_time}` : ''}
                  </span>
                  <div className="flex items-center gap-1.5 mb-1">
                    {platformIcon(c.platform, 14, true)}
                  </div>
                  <span className="text-sm font-medium text-foreground block mb-1">{c.title}</span>
                  {c.content_type !== 'stories' && (() => {
                    const copyPreview = c.copy_text ? c.copy_text.replace(/<[^>]*>/g, '').slice(0, 120) : null;
                    return copyPreview ? (
                      <p className="text-xs text-muted-foreground truncate">{copyPreview}{c.copy_text && c.copy_text.replace(/<[^>]*>/g, '').length > 120 ? '…' : ''}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground truncate">Sem copy</p>
                    );
                  })()}
                  <p className="text-xs text-muted-foreground mt-1">
                    Por {c.assignee_profile?.display_name ?? 'N/A'}
                  </p>
                </div>
                {!isClient && (
                  <div className="flex flex-col items-stretch gap-2 flex-shrink-0 w-[170px]">
                    <Button size="sm" className="gap-1 text-xs font-semibold border-0 w-full justify-center" style={{ backgroundColor: '#d7ff73', color: '#1a1a1a' }} onClick={() => setSelectedContent(c)}>
                      <Pencil size={14} /> Fazer ajustes
                    </Button>
                    <Button size="sm" className="gap-1 text-xs font-semibold border-0 w-full justify-center" style={{ backgroundColor: '#ff88db', color: '#1a1a1a' }} onClick={() => updateContentStatus(c.id, 'approval-client')}>
                      <Check size={14} /> Enviar para aprovação
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default ReviewPage;
