import { useNavigate } from 'react-router-dom';
import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/contexts/AppContext';
import { useClientFromUrl } from '@/hooks/useClientFromUrl';
import { useAuth } from '@/contexts/AuthContext';
import { Palette, Link2, Users } from 'lucide-react';

const ClientSettingsPage = () => {
  useClientFromUrl();
  const navigate = useNavigate();
  const { selectedProject } = useApp();
  const { role } = useAuth();

  if (!selectedProject) return null;

  const canAccess = role === 'admin' || role === 'moderator';
  if (!canAccess) {
    navigate(`/clients/${selectedProject.id}/dashboard`);
    return null;
  }

  const isClient = false;

  const sections = [
    { 
      icon: Link2, 
      label: 'Redes Sociais', 
      desc: 'Gerencie as plataformas ativas',
      onClick: () => navigate(`/clients/${selectedProject.id}/platforms`),
    },
    { 
      icon: Users, 
      label: 'Acessos', 
      desc: 'Gerencie membros e permissões',
      onClick: () => navigate(`/clients/${selectedProject.id}/members`),
      hideFromClient: true
    },
    { 
      icon: Palette, 
      label: 'Aparência', 
      desc: 'Cor e logo do projeto',
      onClick: () => navigate(`/clients/${selectedProject.id}/appearance`),
    },
  ];

  const filteredSections = sections.filter(s => {
    if (isClient && (s as any).hideFromClient) return false;
    return true;
  });

  return (
    <>
      <TopBar title="Configurações" subtitle={selectedProject.name} actions={<></>} />
      <div className="p-6 max-w-2xl">
        <div className="space-y-2">
          {filteredSections.map(s => (
            <button
              key={s.label}
              onClick={s.onClick}
              disabled={(s as any).disabled}
              className="w-full flex items-center gap-4 p-4 rounded-xl hover:shadow-sm transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--client-50, hsl(var(--card)))', borderWidth: '1.5px', borderColor: 'var(--client-200, hsl(var(--border)))' }}
            >
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'var(--client-100)' }}
              >
                <s.icon size={20} style={{ color: 'var(--client-600)' }} />
              </div>
              <div className="flex-1 min-w-0">
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
export default ClientSettingsPage;
