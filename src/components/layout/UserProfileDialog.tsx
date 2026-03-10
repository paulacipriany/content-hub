import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Camera } from 'lucide-react';

interface UserProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UserProfileDialog = ({ open, onOpenChange }: UserProfileDialogProps) => {
  const { user, profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentAvatarUrl = avatarPreview ?? profile?.avatar_url;
  const initials = (displayName || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const handleOpenChange = (v: boolean) => {
    if (v) {
      setDisplayName(profile?.display_name ?? '');
      setEmail(user?.email ?? '');
      setPassword('');
      setConfirmPassword('');
      setAvatarPreview(null);
    }
    onOpenChange(v);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Add cache-busting param
      const url = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: url } as any)
        .eq('id', profile!.id);
      if (updateError) throw updateError;

      setAvatarPreview(url);
      toast.success('Avatar atualizado!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar avatar');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!profile || !user) return;

    if (password && password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (password && password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setSaving(true);
    try {
      if (displayName !== profile.display_name) {
        const { error } = await supabase
          .from('profiles')
          .update({ display_name: displayName } as any)
          .eq('id', profile.id);
        if (error) throw error;
      }

      if (email !== user.email) {
        const { error } = await supabase.auth.updateUser({ email });
        if (error) throw error;
        toast.info('Um e-mail de confirmação foi enviado para o novo endereço');
      }

      if (password) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
      }

      await refreshProfile();
      toast.success('Perfil atualizado com sucesso');
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao atualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Meu Perfil</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Avatar with upload */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="relative group w-20 h-20 rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {currentAvatarUrl ? (
                <img src={currentAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                  <span className="text-primary text-2xl font-semibold">{initials}</span>
                </div>
              )}
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {uploading ? (
                  <Loader2 size={20} className="text-white animate-spin" />
                ) : (
                  <Camera size={20} className="text-white" />
                )}
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center -mt-2">Clique para alterar</p>

          <div className="space-y-2">
            <Label htmlFor="profile-name">Nome</Label>
            <Input
              id="profile-name"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Seu nome"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-email">E-mail</Label>
            <Input
              id="profile-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-password">Nova senha</Label>
            <Input
              id="profile-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Deixe em branco para manter"
            />
          </div>

          {password && (
            <div className="space-y-2">
              <Label htmlFor="profile-confirm">Confirmar senha</Label>
              <Input
                id="profile-confirm"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirme a nova senha"
              />
            </div>
          )}

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving && <Loader2 size={16} className="mr-2 animate-spin" />}
            Salvar alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserProfileDialog;
