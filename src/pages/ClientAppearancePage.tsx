import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/contexts/AppContext';
import { useClientFromUrl } from '@/hooks/useClientFromUrl';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ImagePlus, Loader2, Trash2 } from 'lucide-react';

const COLORS = ['#F97316', '#8B5CF6', '#10B981', '#3B82F6', '#EF4444', '#EC4899', '#14B8A6', '#F59E0B'];

const ClientAppearancePage = () => {
  useClientFromUrl();
  const navigate = useNavigate();
  const { selectedProject, refetch } = useApp();
  const { role } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [color, setColor] = useState(selectedProject?.color ?? COLORS[0]);
  const [logoUrl, setLogoUrl] = useState<string | null>((selectedProject as any)?.logo_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!selectedProject) return null;

  const canAccess = role === 'admin' || role === 'moderator';
  if (!canAccess) {
    navigate(`/clients/${selectedProject.id}/dashboard`);
    return null;
  }

  const handleLogoUpload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${selectedProject.id}.${ext}`;
    const { error } = await supabase.storage.from('client-logos').upload(path, file, { upsert: true });
    if (error) {
      toast({ title: 'Erro ao enviar logo', description: error.message, variant: 'destructive' });
      setUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from('client-logos').getPublicUrl(path);
    setLogoUrl(publicUrl);
    setUploading(false);
  };

  const handleRemoveLogo = () => {
    setLogoUrl(null);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('projects')
      .update({ color, logo_url: logoUrl } as any)
      .eq('id', selectedProject.id);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Aparência atualizada com sucesso' });
      await refetch();
    }
    setSaving(false);
  };

  return (
    <>
      <TopBar
        title="Aparência"
        subtitle={selectedProject.name}
        actions={
          <Button onClick={handleSave} disabled={saving} className="btn-action-primary">
            {saving ? <Loader2 size={16} className="mr-1.5 animate-spin" /> : null}
            SALVAR
          </Button>
        }
      />
      <div className="p-6 max-w-2xl space-y-8">
        {/* Back link */}
        <button
          onClick={() => navigate(`/clients/${selectedProject.id}/settings`)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} />
          Voltar para configurações
        </button>

        {/* Logo section */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Logo do projeto</Label>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden hover:border-primary/40 transition-colors flex-shrink-0"
            >
              {uploading ? (
                <Loader2 size={24} className="animate-spin text-primary" />
              ) : logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <ImagePlus size={24} className="text-muted-foreground" />
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleLogoUpload(f);
                e.target.value = '';
              }}
            />
            <div className="space-y-1.5">
              <p className="text-sm text-muted-foreground">
                {logoUrl ? 'Clique na imagem para trocar o logo' : 'Clique para adicionar um logo'}
              </p>
              {logoUrl && (
                <button
                  onClick={handleRemoveLogo}
                  className="flex items-center gap-1 text-xs text-destructive hover:underline"
                >
                  <Trash2 size={12} />
                  Remover logo
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Color section */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Cor do projeto</Label>
          <div className="flex items-center gap-2 flex-wrap">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="w-8 h-8 rounded-full border-2 transition-all hover:scale-110"
                style={{
                  backgroundColor: c,
                  borderColor: color === c ? 'var(--foreground)' : 'transparent',
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <input
              type="color"
              value={color.length === 7 ? color : '#000000'}
              onChange={e => setColor(e.target.value.toUpperCase())}
              className="w-9 h-9 rounded border border-border cursor-pointer bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded"
            />
            <Input
              value={color}
              onChange={e => {
                const v = e.target.value;
                if (/^#[0-9A-Fa-f]{0,6}$/.test(v) || v === '#') setColor(v);
              }}
              maxLength={7}
              placeholder="#000000"
              className="w-28 font-mono text-sm"
            />
          </div>

          {/* Preview */}
          <div className="mt-4 p-4 bg-card border border-border rounded-xl">
            <p className="text-xs text-muted-foreground mb-2">Pré-visualização</p>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden"
                style={{ backgroundColor: color + '20' }}
              >
                {logoUrl ? (
                  <img src={logoUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-5 h-5 rounded-full" style={{ backgroundColor: color }} />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color }}>{selectedProject.name}</p>
                <p className="text-xs text-muted-foreground">Exemplo de como a cor será aplicada</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ClientAppearancePage;
