import { useState, useCallback } from 'react';
import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { platformIcon } from '@/components/content/PlatformIcons';
import { ContentWithRelations } from '@/data/types';
import { CheckCircle, Eye, MessageSquare, Clock, Check, Copy, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useClientFromUrl } from '@/hooks/useClientFromUrl';
import { toast } from 'sonner';
import JSZip from 'jszip';
import { recordApproval } from '@/lib/approvalUtils';

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

const ApprovalsPage = () => {
  useClientFromUrl();
  const { projectContents, setSelectedContent, updateContentStatus, refetch } = useApp();
  const { role, user } = useAuth();
  const isClient = role === 'client';
  const approvals = projectContents.filter(c => c.status === 'approval-client');
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownloadZip = useCallback(async (content: ContentWithRelations) => {
    const urls = getContentMediaUrls(content);
    if (urls.length === 0) return;
    setDownloading(content.id);
    try {
      const zip = new JSZip();
      await Promise.all(urls.map(async (url, i) => {
        const res = await fetch(url);
        const blob = await res.blob();
        const ext = url.split('.').pop()?.split('?')[0] || 'jpg';
        zip.file(`${content.title.replace(/[^a-zA-Z0-9]/g, '_')}_${i + 1}.${ext}`, blob);
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
      setDownloading(null);
    }
  }, []);

  return (
    <>
      <TopBar title="Aprovações" subtitle="Revise e aprove conteúdos pendentes" />
      <div className="p-6">
        {approvals.length === 0 ? (
          <div className="text-center py-20">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'var(--client-100, hsl(var(--secondary)))' }}
            >
              <CheckCircle size={32} style={{ color: 'var(--client-500, hsl(var(--primary)))' }} />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-1">Tudo aprovado!</h2>
            <p className="text-sm text-muted-foreground">Não há conteúdos aguardando aprovação.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {approvals.map(c => (
              <div
                key={c.id}
                className="bg-card border rounded-xl p-4 flex items-center gap-4 hover:shadow-sm transition-shadow"
                style={{ borderColor: 'var(--client-100, hsl(var(--border)))' }}
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
                  {(() => {
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

                  {/* Copy text & download buttons */}
                  {(c.copy_text || getContentMediaUrls(c).length > 0) && (
                    <div className="flex gap-2 mt-2">
                      {c.copy_text && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs border-0"
                          style={{ backgroundColor: '#c5daf7', color: '#1369db' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(c.copy_text ?? '');
                            toast.success('Texto copiado!');
                          }}
                        >
                          <Copy size={13} /> Copiar texto
                        </Button>
                      )}
                      {getContentMediaUrls(c).length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs border-0"
                          style={{ backgroundColor: '#c5daf7', color: '#1369db' }}
                          disabled={downloading === c.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadZip(c);
                          }}
                        >
                          {downloading === c.id ? (
                            <><Loader2 size={13} className="animate-spin" /> Baixando...</>
                          ) : (
                            <><Download size={13} /> Baixar mídias</>
                          )}
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-col items-stretch gap-2 flex-shrink-0 w-[170px]">
                  <Button size="sm" className="gap-1 text-xs font-semibold border-0 w-full justify-center" style={{ backgroundColor: '#d7ff73', color: '#1a1a1a' }} onClick={() => setSelectedContent(c)}>
                    <MessageSquare size={14} /> Revisar
                  </Button>
                  <Button size="sm" className="gap-1 text-xs font-semibold border-0 w-full justify-center" style={{ backgroundColor: '#ff88db', color: '#1a1a1a' }} onClick={async () => {
                    if (!user) return;
                    const { allApproved, error } = await recordApproval(c.id, user.id);
                    if (error) {
                      toast.error(error);
                      return;
                    }
                    if (allApproved) {
                      await updateContentStatus(c.id, 'scheduled');
                    } else {
                      toast.success('Aprovação registrada. Aguardando os demais aprovadores.');
                      await refetch();
                    }
                  }}>
                    <Check size={14} /> Aprovar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default ApprovalsPage;
