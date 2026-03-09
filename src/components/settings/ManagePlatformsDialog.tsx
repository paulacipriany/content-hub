import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Platform } from '@/data/types';
import { PlatformSelector } from '@/components/content/PlatformIcons';
import { useApp } from '@/contexts/AppContext';

interface ManagePlatformsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  currentPlatforms: Platform[];
}

const ManagePlatformsDialog = ({ open, onOpenChange, projectId, currentPlatforms }: ManagePlatformsDialogProps) => {
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(currentPlatforms);
  const [saving, setSaving] = useState(false);
  const { refetch } = useApp();

  const handleSave = async () => {
    if (selectedPlatforms.length === 0) {
      toast.error('Selecione pelo menos uma plataforma');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('projects')
      .update({ platforms: selectedPlatforms })
      .eq('id', projectId);

    setSaving(false);

    if (error) {
      toast.error('Erro ao salvar plataformas');
      console.error(error);
      return;
    }

    toast.success('Plataformas atualizadas com sucesso!');
    await refetch();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gerenciar Redes Sociais</DialogTitle>
          <DialogDescription>
            Selecione as plataformas que deseja utilizar para este projeto
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <PlatformSelector 
            selected={selectedPlatforms} 
            onChange={setSelectedPlatforms}
            size={48}
          />
        </div>

        <div className="flex items-center gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManagePlatformsDialog;
