import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '@/components/layout/TopBar';
import { ArrowLeft, Link2, ExternalLink, CheckCircle2, Circle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useApp } from '@/contexts/AppContext';
import { useClientFromUrl } from '@/hooks/useClientFromUrl';
import { useAuth } from '@/contexts/AuthContext';

interface Integration {
  key: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  status: 'connected' | 'disconnected' | 'error';
  account?: string;
}

const defaultIntegrations: Integration[] = [
  { key: 'instagram', name: 'Instagram', description: 'Publique fotos, carrosséis, reels e stories', icon: '📸', color: '#E4405F', bgColor: 'bg-pink-500/10', status: 'disconnected' },
  { key: 'facebook', name: 'Facebook', description: 'Gerencie postagens e interações na sua página', icon: '👤', color: '#1877F2', bgColor: 'bg-blue-500/10', status: 'disconnected' },
  { key: 'tiktok', name: 'TikTok', description: 'Publique e agende vídeos na plataforma', icon: '🎵', color: '#000000', bgColor: 'bg-foreground/10', status: 'disconnected' },
  { key: 'linkedin', name: 'LinkedIn', description: 'Publique artigos e posts profissionais', icon: '💼', color: '#0A66C2', bgColor: 'bg-blue-600/10', status: 'disconnected' },
  { key: 'youtube', name: 'YouTube', description: 'Envie e gerencie vídeos no canal', icon: '▶️', color: '#FF0000', bgColor: 'bg-red-500/10', status: 'disconnected' },
  { key: 'x', name: 'X (Twitter)', description: 'Publique tweets e threads automaticamente', icon: '🐦', color: '#1DA1F2', bgColor: 'bg-sky-500/10', status: 'disconnected' },
  { key: 'pinterest', name: 'Pinterest', description: 'Crie e agende pins nos seus painéis', icon: '📌', color: '#BD081C', bgColor: 'bg-red-600/10', status: 'disconnected' },
];

const statusConfig = {
  connected: { label: 'Conectado', icon: CheckCircle2, className: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' },
  disconnected: { label: 'Desconectado', icon: Circle, className: 'text-muted-foreground bg-muted border-border' },
  error: { label: 'Erro', icon: AlertTriangle, className: 'text-amber-600 bg-amber-500/10 border-amber-500/20' },
};

const ClientIntegrationsPage = () => {
  useClientFromUrl();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedProject } = useApp();
  const { role } = useAuth();
  const [integrations, setIntegrations] = useState<Integration[]>(defaultIntegrations);

  if (!selectedProject) return null;

  const canManage = role === 'admin' || role === 'moderator';

  const handleConnect = (key: string) => {
    setIntegrations(prev => prev.map(i => i.key === key ? { ...i, status: 'connected' as const, account: `conta_${key}` } : i));
    toast({ title: 'Integração conectada com sucesso!' });
  };

  const handleDisconnect = (key: string) => {
    setIntegrations(prev => prev.map(i => i.key === key ? { ...i, status: 'disconnected' as const, account: undefined } : i));
    toast({ title: 'Integração desconectada' });
  };

  const connectedCount = integrations.filter(i => i.status === 'connected').length;

  return (
    <>
      <TopBar title="Integrações" subtitle={selectedProject.name} actions={<></>} />
      <div className="p-6 max-w-3xl space-y-6">
        <button
          onClick={() => navigate(`/clients/${selectedProject.id}/settings`)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} />
          Voltar para configurações
        </button>

        <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/15">
          <Link2 size={18} className="text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">
              {connectedCount} de {integrations.length} plataformas conectadas
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Conecte as redes sociais deste projeto para publicar e agendar conteúdos.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {integrations.map(integration => {
            const status = statusConfig[integration.status];
            const StatusIcon = status.icon;
            return (
              <div key={integration.key} className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:shadow-sm transition-all">
                <div className={`w-12 h-12 rounded-xl ${integration.bgColor} flex items-center justify-center flex-shrink-0 text-xl`}>
                  {integration.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{integration.name}</p>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${status.className}`}>
                      <StatusIcon size={10} />
                      {status.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{integration.description}</p>
                  {integration.account && (
                    <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                      <ExternalLink size={9} />
                      @{integration.account}
                    </p>
                  )}
                </div>
                {canManage && (
                  <div className="flex-shrink-0">
                    {integration.status === 'connected' ? (
                      <Button variant="outline" size="sm" className="h-8 text-xs text-destructive border-destructive/20 hover:bg-destructive/10" onClick={() => handleDisconnect(integration.key)}>
                        Desconectar
                      </Button>
                    ) : (
                      <Button size="sm" className="h-8 text-xs" style={{ backgroundColor: integration.color, color: '#fff' }} onClick={() => handleConnect(integration.key)}>
                        Conectar
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">
            As integrações utilizam OAuth 2.0 para conexão segura com as plataformas.
            <br />
            Nenhuma senha é armazenada.
          </p>
        </div>
      </div>
    </>
  );
};

export default ClientIntegrationsPage;
