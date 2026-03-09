import { useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/contexts/AppContext';
import { useClientFromUrl } from '@/hooks/useClientFromUrl';
import { Shield, Palette, Link2 } from 'lucide-react';
import ManagePlatformsDialog from '@/components/settings/ManagePlatformsDialog';
import { Platform } from '@/data/types';
import { platformIcon } from '@/components/content/PlatformIcons';

const ClientSettingsPage = () => {
  useClientFromUrl();
  const { selectedProject } = useApp();
  const [platformsDialogOpen, setPlatformsDialogOpen] = useState(false);

  if (!selectedProject) return null;

  const currentPlatforms = ((selectedProject as any).platforms ?? ['instagram']) as Platform[];

  const sections = [
    { 
      icon: Link2, 
      label: 'Redes Sociais', 
      desc: 'Gerencie as plataformas ativas',
      onClick: () => setPlatformsDialogOpen(true),
      preview: platformIcon(currentPlatforms, 16, true)
    },
    { 
      icon: Palette, 
      label: 'Aparência', 
      desc: 'Cor e logo do projeto',
      onClick: () => {},
      disabled: true
    },
    { 
      icon: Shield, 
      label: 'Permissões', 
      desc: 'Gerencie membros e acessos',
      onClick: () => {},
      disabled: true
    },
  ];

  return (
    <>
      <TopBar title="Configurações" subtitle={selectedProject.name} />
      <div className="p-6 max-w-2xl">
        <div className="space-y-2">
          {sections.map(s => (
            <button
              key={s.label}
              onClick={s.onClick}
              disabled={s.disabled}
              className="w-full flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:shadow-sm hover:border-primary/20 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
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
              {s.preview && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  {s.preview}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <ManagePlatformsDialog
        open={platformsDialogOpen}
        onOpenChange={setPlatformsDialogOpen}
        projectId={selectedProject.id}
        currentPlatforms={currentPlatforms}
      />
    </>
  );
};

export default ClientSettingsPage;
