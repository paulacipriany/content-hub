import { useEffect, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Trash2, Pencil, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';

interface SimpleProject { id: string; name: string; color: string; }

interface UserRow {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'moderator' | 'social_media' | 'client';
  approved: boolean;
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
  const [projects, setProjects] = useState<SimpleProject[]>([]);
  const [loading, setLoading] = useState(true);
  const { confirmDelete, ConfirmDialog } = useConfirmDelete();

  // Edit dialog
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<string>('social_media');
  const [editProjectIds, setEditProjectIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addName, setAddName] = useState('');
  const [addRole, setAddRole] = useState<string>('social_media');
  const [addProjectIds, setAddProjectIds] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from('profiles').select('user_id, display_name, avatar_url, approved');
    const { data: roles } = await supabase.from('user_roles').select('user_id, role');

    if (profiles && roles) {
      const roleMap = new Map(roles.map(r => [r.user_id, r.role]));
      const merged: UserRow[] = profiles.map(p => ({
        user_id: p.user_id,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        role: (roleMap.get(p.user_id) as UserRow['role']) ?? 'social_media',
        approved: p.approved ?? false,
      }));
      merged.sort((a, b) => {
        // Unapproved first
        if (a.approved !== b.approved) return a.approved ? 1 : -1;
        return (a.display_name ?? '').localeCompare(b.display_name ?? '');
      });
      setUsers(merged);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
    supabase.from('projects').select('id, name, color').then(({ data }) => {
      if (data) setProjects(data);
    });
  }, []);

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

  const openEdit = async (u: UserRow) => {
    setEditUser(u);
    setEditName(u.display_name ?? '');
    setEditEmail('');
    setEditPassword('');
    setEditRole(u.role);
    const { data } = await supabase.from('project_members').select('project_id').eq('user_id', u.user_id);
    setEditProjectIds(data?.map(r => r.project_id) ?? []);
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setSaving(true);

    const [profileRes, roleRes] = await Promise.all([
      supabase.from('profiles').update({ display_name: editName }).eq('user_id', editUser.user_id),
      editRole !== editUser.role
        ? supabase.from('user_roles').update({ role: editRole as any }).eq('user_id', editUser.user_id)
        : Promise.resolve({ error: null }),
    ]);

    // Update email/password via edge function if changed
    if (editEmail || editPassword) {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (token) {
        await supabase.functions.invoke('admin-update-user', {
          body: { user_id: editUser.user_id, email: editEmail || undefined, password: editPassword || undefined },
        });
      }
    }

    // Sync project_members: auto-select all for admin
    const finalProjectIds = editRole === 'admin' ? projects.map(p => p.id) : editProjectIds;
    await supabase.from('project_members').delete().eq('user_id', editUser.user_id);
    if (finalProjectIds.length > 0) {
      await supabase.from('project_members').insert(
        finalProjectIds.map(pid => ({ project_id: pid, user_id: editUser.user_id }))
      );
    }

    if (profileRes.error || roleRes.error) {
      toast.error('Erro ao salvar alterações');
    } else {
      toast.success('Usuário atualizado');
      setUsers(prev => prev.map(u =>
        u.user_id === editUser.user_id
          ? { ...u, display_name: editName, role: editRole as UserRow['role'] }
          : u
      ));
      setEditUser(null);
    }
    setSaving(false);
  };

  const handleAddUser = async () => {
    if (!addEmail || !addPassword || !addName) {
      toast.error('Preencha todos os campos');
      return;
    }
    setAdding(true);

    const { data: signUpData, error } = await supabase.auth.signUp({
      email: addEmail,
      password: addPassword,
      options: {
        data: { display_name: addName, role: addRole },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      toast.error(error.message);
    } else {
      // If client role, add project memberships after a delay for the trigger to finish
      if (addRole === 'client' && addProjectIds.length > 0 && signUpData.user) {
        const userId = signUpData.user.id;
        setTimeout(async () => {
          await supabase.from('project_members').insert(
            addProjectIds.map(pid => ({ project_id: pid, user_id: userId }))
          );
        }, 2000);
      }
      toast.success('Usuário criado! Um e-mail de confirmação foi enviado.');
      setAddOpen(false);
      setAddEmail('');
      setAddPassword('');
      setAddName('');
      setAddRole('social_media');
      setAddProjectIds([]);
      // Refetch after a short delay to allow trigger to create profile
      setTimeout(() => fetchUsers(), 2000);
    }
    setAdding(false);
  };

  const initials = (name: string | null) =>
    name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??';

  return (
    <>
      <TopBar title="Usuários" subtitle="Gerencie todos os usuários da plataforma" />
      <div className="p-6 max-w-3xl">
        <div className="flex justify-end mb-4">
          <Button onClick={() => setAddOpen(true)} size="sm" className="gap-1.5">
            <UserPlus size={15} />
            Novo usuário
          </Button>
        </div>

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
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(u)}>
                  <Pencil size={14} />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => confirmDelete(() => handleDelete(u.user_id), `"${u.display_name || 'este usuário'}"`)}>
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

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Nome</Label>
              <Input id="edit-name" value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-email">E-mail</Label>
              <Input id="edit-email" type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="Deixe vazio para manter o atual" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-password">Nova senha</Label>
              <Input id="edit-password" type="password" value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="Deixe vazio para manter a atual" />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={editRole} onValueChange={(val) => {
                setEditRole(val);
                if (val === 'admin') setEditProjectIds(projects.map(p => p.id));
              }}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="moderator">Gestor</SelectItem>
                  <SelectItem value="social_media">Social Media</SelectItem>
                  <SelectItem value="client">Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Clientes vinculados</Label>
              {editRole === 'admin' ? (
                <p className="text-xs text-muted-foreground">Admins têm acesso a todos os clientes automaticamente.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto rounded-md border border-border p-2">
                  {projects.map(p => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox
                        checked={editProjectIds.includes(p.id)}
                        onCheckedChange={(checked) => {
                          setEditProjectIds(prev =>
                            checked ? [...prev, p.id] : prev.filter(id => id !== p.id)
                          );
                        }}
                      />
                      <span className="truncate text-foreground">{p.name}</span>
                    </label>
                  ))}
                  {projects.length === 0 && <p className="text-xs text-muted-foreground">Nenhum cliente cadastrado</p>}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="add-name">Nome</Label>
              <Input id="add-name" value={addName} onChange={e => setAddName(e.target.value)} placeholder="Nome completo" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-email">E-mail</Label>
              <Input id="add-email" type="email" value={addEmail} onChange={e => setAddEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-password">Senha</Label>
              <Input id="add-password" type="password" value={addPassword} onChange={e => setAddPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={addRole} onValueChange={(val) => {
                setAddRole(val);
                if (val === 'admin') setAddProjectIds(projects.map(p => p.id));
              }}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="moderator">Gestor</SelectItem>
                  <SelectItem value="social_media">Social Media</SelectItem>
                  <SelectItem value="client">Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Clientes vinculados</Label>
              {addRole === 'admin' ? (
                <p className="text-xs text-muted-foreground">Admins têm acesso a todos os clientes automaticamente.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto rounded-md border border-border p-2">
                  {projects.map(p => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox
                        checked={addProjectIds.includes(p.id)}
                        onCheckedChange={(checked) => {
                          setAddProjectIds(prev =>
                            checked ? [...prev, p.id] : prev.filter(id => id !== p.id)
                          );
                        }}
                      />
                      <span className="truncate text-foreground">{p.name}</span>
                    </label>
                  ))}
                  {projects.length === 0 && <p className="text-xs text-muted-foreground">Nenhum cliente cadastrado</p>}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddUser} disabled={adding}>
              {adding ? 'Criando...' : 'Criar usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog />
    </>
  );
};

export default UsersPage;
