import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/contexts/AppContext';
import { STATUS_LABELS, STATUS_COLORS, WorkflowStatus } from '@/data/types';
import { platformIcon } from '@/components/content/PlatformIcons';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useClientFromUrl } from '@/hooks/useClientFromUrl';

const ApprovalsPage = () => {
  useClientFromUrl();
  const { projectContents, setSelectedContent, updateContentStatus } = useApp();
  const approvals = projectContents.filter(c => c.status === 'approval-internal' || c.status === 'approval-client');

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
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {platformIcon(c.platform, 14)}
                    <span className="text-sm font-medium text-foreground">{c.title}</span>
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium text-primary-foreground", STATUS_COLORS[c.status as WorkflowStatus])}>
                      {STATUS_LABELS[c.status as WorkflowStatus]}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{c.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Por {c.assignee_profile?.display_name ?? 'N/A'} · {c.publish_date ? new Date(c.publish_date).toLocaleDateString('pt-BR') : 'Sem data'}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setSelectedContent(c)}>
                    <MessageSquare size={14} /> Revisar
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1 text-xs"
                    style={{ backgroundColor: 'var(--client-500, hsl(var(--primary)))', color: 'var(--client-50, hsl(var(--primary-foreground)))' }}
                    onClick={() => updateContentStatus(c.id, 'scheduled')}
                  >
                    <CheckCircle size={14} /> Aprovar
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1 text-xs text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => updateContentStatus(c.id, 'review')}>
                    <XCircle size={14} /> Rejeitar
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
