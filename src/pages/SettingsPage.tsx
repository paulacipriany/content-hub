import TopBar from '@/components/layout/TopBar';
import { Users, Shield, Bell, Palette, Link2 } from 'lucide-react';

const sections = [
  { icon: Users, label: 'Equipe', desc: 'Gerencie membros e permissões' },
  { icon: Shield, label: 'Permissões', desc: 'Configure roles e acessos' },
  { icon: Bell, label: 'Notificações', desc: 'Preferências de notificação' },
  { icon: Palette, label: 'Aparência', desc: 'Tema e personalização' },
  { icon: Link2, label: 'Integrações', desc: 'Instagram, Facebook, TikTok, LinkedIn, YouTube' },
];

const SettingsPage = () => {
  return (
    <>
      <TopBar title="Configurações" subtitle="Gerencie as configurações da plataforma" />
      <div className="p-6 max-w-2xl">
        <div className="space-y-2">
          {sections.map(s => (
            <button
              key={s.label}
              className="w-full flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:shadow-sm hover:border-primary/20 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <s.icon size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default SettingsPage;
