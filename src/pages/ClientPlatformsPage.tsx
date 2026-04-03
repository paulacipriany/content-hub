import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/contexts/AppContext';
import { useClientFromUrl } from '@/hooks/useClientFromUrl';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Platform, PLATFORM_LABELS } from '@/data/types';
import { PlatformSelector, PLATFORM_ICONS, PLATFORM_COLORS } from '@/components/content/PlatformIcons';
import { toast } from 'sonner';

type PlatformProfile = {
  platform: Platform;
  profile_url: string;
  username: string;
};

const ClientPlatformsPage = () => {
  useClientFromUrl();
  const navigate = useNavigate();
  const { selectedProject, refetch } = useApp();
  const { role } = useAuth();

  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [profiles, setProfiles] = useState<Record<string, PlatformProfile>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const canAccess = role === 'admin' || role === 'moderator';

  useEffect(() => {
    if (selectedProject) {
      setSelectedPlatforms((selectedProject as any).platforms ?? ['instagram']);
      loadProfiles();
    }
  }, [selectedProject?.id]);

  const loadProfiles = async () => {
    if (!selectedProject) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('project_platform_profiles')
      .select('*')
      .eq('project_id', selectedProject.id);

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
    if (!selectedProject) return;
    if (selectedPlatforms.length === 0) {
      toast.error('Selecione pelo menos uma plataforma');
      return;
    }

    setSaving(true);

    const { error: projError } = await supabase
      .from('projects')
      .update({ platforms: selectedPlatforms })
      .eq('id', selectedProject.id);

    if (projError) {
      toast.error('Erro ao salvar plataformas');
      setSaving(false);
      return;
    }

    const upserts = selectedPlatforms.map(p => ({
      project_id: selectedProject.id,
      platform: p,
      profile_url: (profiles[p]?.profile_url || '').trim(),
      username: (profiles[p]?.username || '').trim().replace(/^@/, ''),
    }));

    if (upserts.length > 0) {
      const { error: profileError } = await supabase
        .from('project_platform_profiles')
        .upsert(upserts, { onConflict: 'project_id,platform' });

      if (profileError) {
        toast.error('Erro ao salvar perfis das plataformas');
        setSaving(false);
        return;
      }
    }

    const deselected = Object.keys(profiles).filter(p => !selectedPlatforms.includes(p as Platform));
    if (deselected.length > 0) {
      await supabase
        .from('project_platform_profiles')
        .delete()
        .eq('project_id', selectedProject.id)
        .in('platform', deselected);
    }

    setSaving(false);
    toast.success('Redes sociais atualizadas com sucesso!');
    await refetch();
  };

  if (!selectedProject) return null;
  if (!canAccess) {
    navigate(`/clients/${selectedProject.id}/dashboard`);
    return null;
  }

  return (
    <>
      <TopBar
        title="Redes Sociais"
        subtitle={selectedProject.name}
        actions={
          <Button onClick={handleSave} disabled={saving || loading} className="btn-action-primary">
            {saving ? <Loader2 size={16} className="mr-1.5 animate-spin" /> : null}
            SALVAR
          </Button>
        }
      />
      <div className="p-6 max-w-2xl space-y-6">
        <button
          onClick={() => navigate(`/clients/${selectedProject.id}/settings`)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} />
          Voltar para configurações
        </button>

        <div className="space-y-3">
          <Label className="text-sm font-semibold">Plataformas ativas</Label>
          <p className="text-xs text-muted-foreground">Selecione as plataformas e configure o perfil de cada uma</p>
          <PlatformSelector
            selected={selectedPlatforms}
            onChange={setSelectedPlatforms}
            size={40}
          />
        </div>

        {selectedPlatforms.length > 0 && (
          <div className="space-y-4">
            {selectedPlatforms.map(p => {
              const Icon = PLATFORM_ICONS[p];
              const color = PLATFORM_COLORS[p];
              return (
                <div key={p} className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span style={{ color }}><Icon size={18} /></span>
                    <span className="text-sm font-medium text-foreground">{PLATFORM_LABELS[p]}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">@ Usuário</Label>
                      <Input
                        placeholder="@usuario"
                        value={profiles[p]?.username || ''}
                        onChange={e => updateProfile(p, 'username', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">URL do perfil</Label>
                      <Input
                        placeholder="https://..."
                        value={profiles[p]?.profile_url || ''}
                        onChange={e => updateProfile(p, 'profile_url', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default ClientPlatformsPage;
