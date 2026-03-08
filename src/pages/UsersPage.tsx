import { useEffect, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UserRow {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'moderator' | 'social_media' | 'client';
}

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  moderator: 'Gestor',
  social_media: 'Social Media',
  client: 'Cliente',
};

const roleBadgeVariant: Record<string, string> = {
  admin: 'bg-red-500/15 text-red-400',
  moderator: 'bg-amber-500/15 text-amber-400',
  social_media: 'bg-blue-500/15 text-blue-400',
  client: 'bg-emerald-500/15 text-emerald-400',
};

const UsersPage = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from('profiles').select('user_id, display_name, avatar_url');
    const { data: roles } = await supabase.from('user_roles').select('user_id, role');

    if (profiles && roles) {
      const roleMap = new Map(roles.map(r => [r.user_id, r.role]));
      const merged: UserRow[] = profiles.map(p => ({
        user_id: p.user_id,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        role: (roleMap.get(p.user_id) as UserRow['role']) ?? 'social_media',
      }));
      merged.sort((a, b) => (a.display_name ?? '').localeCompare(b.display_name ?? ''));
      setUsers(merged);
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole as any })
      .eq('user_id', userId);
    if (error) {
      toast.error('Erro ao atualizar role');
    } else {
      toast.success('Role atualizado');
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, role: newRole as UserRow['role'] } : u));
    }
  };

  const handleDelete = async (userId: string) => {
    const { error } = await supabase.from('user_roles').delete().eq('user_id', userId);
    if (error) {
      toast.error('Erro ao remover usuário');
    } else {
      toast.success('Usuário removido');
      setUsers(prev => prev.filter(u => u.user_id !== userId));
    }
  };

  const initials = (name: string | null) =>
    name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??';

  return (
    <>
      <TopBar title="Usuários" subtitle="Gerencie todos os usuários da plataforma" />
      <div className="p-6 max-w-3xl">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-1">
            {users.map(u => (
              <div key={u.user_id} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover:border-primary/20 transition-colors">
                <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <span className="text-primary text-xs font-semibold">{initials(u.display_name)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{u.display_name ?? 'Sem nome'}</p>
                  <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${roleBadgeVariant[u.role]}`}>
                    {roleLabels[u.role]}
                  </span>
                </div>
                <Select value={u.role} onValueChange={(val) => handleRoleChange(u.user_id, val)}>
                  <SelectTrigger className="w-36 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="moderator">Gestor</SelectItem>
                    <SelectItem value="social_media">Social Media</SelectItem>
                    <SelectItem value="client">Cliente</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(u.user_id)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
            {users.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum usuário encontrado.</p>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default UsersPage;
