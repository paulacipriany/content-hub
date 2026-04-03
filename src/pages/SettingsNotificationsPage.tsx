import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '@/components/layout/TopBar';
import { ArrowLeft, Bell, Mail, MessageSquare, UserPlus, ClipboardList, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface NotifPref {
  key: string;
  icon: React.ElementType;
  label: string;
  description: string;
  inApp: boolean;
  email: boolean;
}

const defaultPrefs: NotifPref[] = [
  { key: 'status_change', icon: ClipboardList, label: 'Mudança de status', description: 'Quando o status de um conteúdo é alterado', inApp: true, email: true },
  { key: 'new_comment', icon: MessageSquare, label: 'Novo comentário', description: 'Quando alguém comenta em um conteúdo', inApp: true, email: false },
  { key: 'assignee_change', icon: UserPlus, label: 'Atribuição', description: 'Quando você é atribuído a um conteúdo', inApp: true, email: true },
  { key: 'approval_request', icon: Bell, label: 'Solicitação de aprovação', description: 'Quando um conteúdo precisa da sua aprovação', inApp: true, email: true },
  { key: 'task_assigned', icon: ClipboardList, label: 'Nova tarefa', description: 'Quando uma tarefa é criada ou atribuída a você', inApp: true, email: false },
  { key: 'calendar_reminder', icon: CalendarDays, label: 'Lembretes de calendário', description: 'Lembrete de datas de publicação próximas', inApp: true, email: false },
];

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-muted-foreground/20'}`}
  >
    <span
      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`}
    />
  </button>
);

const SettingsNotificationsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<NotifPref[]>(defaultPrefs);
  const [saving, setSaving] = useState(false);

  const updatePref = (key: string, field: 'inApp' | 'email', value: boolean) => {
    setPrefs(prev => prev.map(p => p.key === key ? { ...p, [field]: value } : p));
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast({ title: 'Preferências salvas com sucesso' });
    }, 600);
  };

  return (
    <>
      <TopBar
        title="Notificações"
        subtitle="Preferências de notificação"
        actions={
          <Button onClick={handleSave} disabled={saving} className="btn-action-primary" size="sm">
            {saving ? 'Salvando...' : 'SALVAR'}
          </Button>
        }
      />
      <div className="p-6 max-w-3xl space-y-6">
        {/* Back */}
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} />
          Voltar para configurações
        </button>

        {/* Info banner */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/15">
          <Bell size={18} className="text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Gerencie suas notificações</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Escolha quais notificações deseja receber na plataforma e por e-mail.
            </p>
          </div>
        </div>

        {/* Notification preferences */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_80px_80px] px-5 py-3 border-b border-border bg-secondary/40">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tipo</p>
            <div className="flex items-center justify-center gap-1.5">
              <Bell size={12} className="text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">App</p>
            </div>
            <div className="flex items-center justify-center gap-1.5">
              <Mail size={12} className="text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">E-mail</p>
            </div>
          </div>

          {/* Rows */}
          {prefs.map((pref, i) => (
            <div
              key={pref.key}
              className={`grid grid-cols-[1fr_80px_80px] px-5 py-4 items-center ${i < prefs.length - 1 ? 'border-b border-border' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <pref.icon size={15} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{pref.label}</p>
                  <p className="text-xs text-muted-foreground">{pref.description}</p>
                </div>
              </div>
              <div className="flex justify-center">
                <Toggle checked={pref.inApp} onChange={v => updatePref(pref.key, 'inApp', v)} />
              </div>
              <div className="flex justify-center">
                <Toggle checked={pref.email} onChange={v => updatePref(pref.key, 'email', v)} />
              </div>
            </div>
          ))}
        </div>

        {/* Quick options */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => {
              setPrefs(prev => prev.map(p => ({ ...p, inApp: true, email: true })));
              toast({ title: 'Todas as notificações ativadas' });
            }}
          >
            Ativar todas
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => {
              setPrefs(prev => prev.map(p => ({ ...p, email: false })));
              toast({ title: 'Notificações por e-mail desativadas' });
            }}
          >
            Desativar e-mails
          </Button>
        </div>
      </div>
    </>
  );
};

export default SettingsNotificationsPage;
