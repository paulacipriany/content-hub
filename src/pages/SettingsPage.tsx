import { useNavigate } from 'react-router-dom';
import TopBar from '@/components/layout/TopBar';
import { Users, Shield, Bell, Palette, ChevronRight } from 'lucide-react';

const SettingsPage = () => {
  const navigate = useNavigate();

  const sections = [
    { icon: Users, label: 'Equipe', desc: 'Gerencie membros e permissões', to: '/settings/team' },
    { icon: Shield, label: 'Permissões', desc: 'Configure roles e acessos', to: '/settings/permissions' },
    { icon: Bell, label: 'Notificações', desc: 'Preferências de notificação', to: '/settings/notifications' },
    { icon: Palette, label: 'Aparência', desc: 'Tema e personalização', to: '/settings/appearance' },
  ];

  return (
    <>
      <TopBar title="Configurações" subtitle="Gerencie as configurações da plataforma" actions={<></>} />
      <div className="p-6 max-w-2xl">
        <div className="space-y-2">
          {sections.map(s => (
            <button
              key={s.label}
              onClick={() => navigate(s.to)}
              className="w-full flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:shadow-sm hover:border-primary/20 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <s.icon size={20} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default SettingsPage;

