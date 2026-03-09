import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface UserProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UserProfileDialog = ({ open, onOpenChange }: UserProfileDialogProps) => {
  const { user, profile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  // Sync state when dialog opens
  const handleOpenChange = (v: boolean) => {
    if (v) {
      setDisplayName(profile?.display_name ?? '');
      setEmail(user?.email ?? '');
      setPassword('');
      setConfirmPassword('');
    }
    onOpenChange(v);
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
      // Update display name
      if (displayName !== profile.display_name) {
        const { error } = await supabase
          .from('profiles')
          .update({ display_name: displayName } as any)
          .eq('id', profile.id);
        if (error) throw error;
      }

      // Update email
      if (email !== user.email) {
        const { error } = await supabase.auth.updateUser({ email });
        if (error) throw error;
        toast.info('Um e-mail de confirmação foi enviado para o novo endereço');
      }

      // Update password
      if (password) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
      }

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
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-primary text-xl font-semibold">
                {(displayName || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </span>
            </div>
          </div>

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
