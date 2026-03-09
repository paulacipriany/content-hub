import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Platform, PLATFORM_LABELS } from '@/data/types';
import { PlatformSelector, PLATFORM_ICONS, PLATFORM_COLORS } from '@/components/content/PlatformIcons';
import { useApp } from '@/contexts/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ManagePlatformsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  currentPlatforms: Platform[];
}

type PlatformProfile = {
  platform: Platform;
  profile_url: string;
  username: string;
};

const ManagePlatformsDialog = ({ open, onOpenChange, projectId, currentPlatforms }: ManagePlatformsDialogProps) => {
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(currentPlatforms);
  const [profiles, setProfiles] = useState<Record<string, PlatformProfile>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const { refetch } = useApp();

  // Load existing profiles when dialog opens
  useEffect(() => {
    if (!open) return;
    setSelectedPlatforms(currentPlatforms);
    loadProfiles();
  }, [open, projectId]);

  const loadProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('project_platform_profiles')
      .select('*')
      .eq('project_id', projectId);

    if (!error && data) {
      const map: Record<string, PlatformProfile> = {};
      data.forEach((row: any) => {
        map[row.platform] = {
          platform: row.platform,
          profile_url: row.profile_url || '',
          username: row.username || '',
        };
      });
      setProfiles(map);
    }
    setLoading(false);
  };

  const updateProfile = (platform: Platform, field: 'profile_url' | 'username', value: string) => {
    setProfiles(prev => ({
      ...prev,
      [platform]: {
        platform,
        profile_url: prev[platform]?.profile_url || '',
        username: prev[platform]?.username || '',
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (selectedPlatforms.length === 0) {
      toast.error('Selecione pelo menos uma plataforma');
      return;
    }

    setSaving(true);

    // Update platforms on project
    const { error: projError } = await supabase
      .from('projects')
      .update({ platforms: selectedPlatforms })
      .eq('id', projectId);

    if (projError) {
      toast.error('Erro ao salvar plataformas');
      setSaving(false);
      return;
    }

    // Upsert platform profiles for selected platforms
    const upserts = selectedPlatforms.map(p => ({
      project_id: projectId,
      platform: p,
      profile_url: (profiles[p]?.profile_url || '').trim(),
      username: (profiles[p]?.username || '').trim().replace(/^@/, ''),
    }));

    if (upserts.length > 0) {
      const { error: profileError } = await supabase
        .from('project_platform_profiles')
        .upsert(upserts, { onConflict: 'project_id,platform' });

      if (profileError) {
        console.error(profileError);
        toast.error('Erro ao salvar perfis das plataformas');
        setSaving(false);
        return;
      }
    }

    // Delete profiles for deselected platforms
    const deselected = Object.keys(profiles).filter(p => !selectedPlatforms.includes(p as Platform));
    if (deselected.length > 0) {
      await supabase
        .from('project_platform_profiles')
        .delete()
        .eq('project_id', projectId)
        .in('platform', deselected);
    }

    setSaving(false);
    toast.success('Plataformas atualizadas com sucesso!');
    await refetch();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Gerenciar Redes Sociais</DialogTitle>
          <DialogDescription>
            Selecione as plataformas e configure o perfil de cada uma
          </DialogDescription>
        </DialogHeader>

        <div className="py-3">
          <PlatformSelector 
            selected={selectedPlatforms} 
            onChange={setSelectedPlatforms}
            size={40}
          />
        </div>

        {selectedPlatforms.length > 0 && (
          <ScrollArea className="flex-1 -mx-6 px-6 max-h-[40vh]">
            <div className="space-y-4 pb-2">
              {selectedPlatforms.map(p => {
                const Icon = PLATFORM_ICONS[p];
                const color = PLATFORM_COLORS[p];
                return (
                  <div key={p} className="rounded-lg border border-border p-3 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <span style={{ color }}><Icon size={18} /></span>
                      <span className="text-sm font-medium text-foreground">{PLATFORM_LABELS[p]}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">@ Usuário</Label>
                        <Input
                          placeholder="@usuario"
                          value={profiles[p]?.username || ''}
                          onChange={e => updateProfile(p, 'username', e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">URL do perfil</Label>
                        <Input
                          placeholder="https://..."
                          value={profiles[p]?.profile_url || ''}
                          onChange={e => updateProfile(p, 'profile_url', e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <div className="flex items-center gap-2 justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManagePlatformsDialog;
