import { useState, useCallback, useEffect } from 'react';
import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { platformIcon } from '@/components/content/PlatformIcons';
import { ContentWithRelations } from '@/data/types';
import { CheckCircle, Eye, MessageSquare, Clock, Check, Copy, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useClientFromUrl } from '@/hooks/useClientFromUrl';
import { toast } from 'sonner';
import JSZip from 'jszip';
import { recordApproval } from '@/lib/approvalUtils';
import { supabase } from '@/integrations/supabase/client';

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
  const [approvalCounts, setApprovalCounts] = useState<Record<string, { approved: number; total: number }>>({});
  const [userApproved, setUserApproved] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchCounts = async () => {
      if (approvals.length === 0) return;
      const ids = approvals.map(a => a.id);
      const [{ data: approvers }, { data: existing }] = await Promise.all([
        supabase.from('content_approvers').select('content_id, user_id').in('content_id', ids),
        supabase.from('approvals').select('content_id, reviewer_id').eq('decision', 'approved').in('content_id', ids),
      ]);
      const counts: Record<string, { approved: number; total: number }> = {};
      const approved: Record<string, boolean> = {};
      ids.forEach(id => {
        const total = (approvers ?? []).filter(a => a.content_id === id).length;
        const approvedCount = (existing ?? []).filter(a => a.content_id === id).length;
        counts[id] = { approved: Math.min(approvedCount, total), total };
        approved[id] = !!(existing ?? []).find(a => a.content_id === id && a.reviewer_id === user?.id);
      });
      setApprovalCounts(counts);
      setUserApproved(approved);
    };
    fetchCounts();
  }, [approvals.map(a => a.id).join(','), user?.id]);

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
                className="border rounded-xl p-4 flex items-center gap-4 hover:shadow-sm transition-shadow"
                style={{ backgroundColor: '#c5daf7', borderColor: 'var(--client-100, hsl(var(--border)))' }}
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
                    {platformIcon(c.platform, 14)}
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
                  {/* Approval progress */}
                  {approvalCounts[c.id] && approvalCounts[c.id].total > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <Progress value={(approvalCounts[c.id].approved / approvalCounts[c.id].total) * 100} className="h-2 flex-1" />
                      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                        {approvalCounts[c.id].approved}/{approvalCounts[c.id].total} aprovado{approvalCounts[c.id].total > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}

                  {/* Copy text & download buttons */}
                  {(c.copy_text || getContentMediaUrls(c).length > 0) && (
                    <div className="flex gap-2 mt-2">
                      {c.copy_text && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-[13px] font-bold uppercase tracking-[1px] border-0 rounded-[5px]"
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
                          className="gap-1.5 text-[13px] font-bold uppercase tracking-[1px] border-0 rounded-[5px]"
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
                  <Button 
                    size="sm" 
                    className="gap-1 text-xs font-semibold border-0 w-full justify-center" 
                    style={{ 
                      backgroundColor: userApproved[c.id] ? '#e5e7eb' : '#c8ff00', 
                      color: userApproved[c.id] ? '#9ca3af' : '#000000' 
                    }} 
                    disabled={userApproved[c.id]}
                    onClick={() => setSelectedContent(c)}
                  >
                    <MessageSquare size={14} /> Revisar
                  </Button>
                  <Button size="sm" className="gap-1 text-xs font-semibold border-0 w-full justify-center" style={{ backgroundColor: userApproved[c.id] ? '#e5e7eb' : '#ff88db', color: userApproved[c.id] ? '#9ca3af' : '#1a1a1a' }} disabled={userApproved[c.id]} onClick={async () => {
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
                    setUserApproved(prev => ({ ...prev, [c.id]: true }));
                  }}>
                    <Check size={14} /> {userApproved[c.id] ? 'Já aprovado' : 'Aprovar'}
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
