import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '@/components/layout/TopBar';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Pencil, Trash2, Search, Shield, Crown, Clock, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';

interface UserRow {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'moderator' | 'social_media' | 'client';
  approved: boolean;
  created_at: string;
  project_ids: string[];
}

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  moderator: 'Gestor',
  social_media: 'Social Media',
  client: 'Cliente',
};

const roleBadgeVariant: Record<string, string> = {
  admin: 'bg-red-500/15 text-red-500',
  moderator: 'bg-amber-500/15 text-amber-600',
  social_media: 'bg-blue-500/15 text-blue-500',
  client: 'bg-emerald-500/15 text-emerald-600',
};

const SettingsTeamPage = () => {
  const navigate = useNavigate();
  const { role: currentRole } = useAuth();
  const { projects, fetchPendingUsersCount } = useApp();
  const { toast } = useToast();
  const { confirmDelete, ConfirmDialog } = useConfirmDelete();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  // Edit
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('social_media');
  const [editProjectIds, setEditProjectIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Add
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addRole, setAddRole] = useState('social_media');
  const [addProjectIds, setAddProjectIds] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);

  const isAdmin = currentRole === 'admin';

  const fetchUsers = async () => {
    setLoading(true);
    const [profilesRes, rolesRes, membersRes] = await Promise.all([
      supabase.from('profiles').select('user_id, display_name, avatar_url, approved, created_at'),
      supabase.from('user_roles').select('user_id, role'),
      supabase.from('project_members').select('user_id, project_id'),
    ]);
    if (profilesRes.data && rolesRes.data) {
      const roleMap = new Map(rolesRes.data.map(r => [r.user_id, r.role]));
      const membersMap = new Map<string, string[]>();
      membersRes.data?.forEach(m => {
        if (!membersMap.has(m.user_id)) membersMap.set(m.user_id, []);
        membersMap.get(m.user_id)?.push(m.project_id);
      });
      setUsers(profilesRes.data.map(p => ({
        user_id: p.user_id,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        role: (roleMap.get(p.user_id) as UserRow['role']) ?? 'social_media',
        approved: p.approved ?? false,
        created_at: p.created_at ?? new Date().toISOString(),
        project_ids: membersMap.get(p.user_id) ?? [],
      })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleDelete = async (userId: string) => {
    const { data, error } = await supabase.functions.invoke('admin-delete-user', { body: { user_id: userId } });
    const msg = error?.message || data?.error;
    if (msg) {
      toast({ title: 'Erro ao remover usuário', description: msg, variant: 'destructive' });
    } else {
      toast({ title: 'Usuário removido com sucesso' });
      await fetchUsers();
      await fetchPendingUsersCount();
    }
  };

  const handleApprove = async (u: UserRow) => {
    await supabase.from('user_roles').update({ role: 'social_media' as any }).eq('user_id', u.user_id);
    await supabase.from('profiles').update({ approved: true } as any).eq('user_id', u.user_id);
    toast({ title: 'Usuário aprovado!' });
    await fetchUsers();
    await fetchPendingUsersCount();
  };

  const openEdit = (u: UserRow) => {
    setEditUser(u);
    setEditName(u.display_name ?? '');
    setEditRole(u.role);
    setEditProjectIds(u.project_ids);
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    await Promise.all([
      supabase.from('profiles').update({ display_name: editName } as any).eq('user_id', editUser.user_id),
      supabase.from('user_roles').update({ role: editRole as any }).eq('user_id', editUser.user_id),
    ]);
    const finalIds = editRole === 'admin' ? projects.map(p => p.id) : editProjectIds;
    await supabase.from('project_members').delete().eq('user_id', editUser.user_id);
    if (finalIds.length > 0) {
      await supabase.from('project_members').insert(finalIds.map(pid => ({ project_id: pid, user_id: editUser.user_id })));
    }
    toast({ title: 'Usuário atualizado com sucesso' });
    setEditUser(null);
    setSaving(false);
    await fetchUsers();
  };

  const handleAdd = async () => {
    if (!addEmail || !addPassword || !addName) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    setAdding(true);
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: addEmail,
      password: addPassword,
      options: { data: { display_name: addName, role: addRole }, emailRedirectTo: window.location.origin },
    });
    if (error) {
      toast({ title: 'Erro ao criar usuário', description: error.message, variant: 'destructive' });
    } else {
      if (addProjectIds.length > 0 && signUpData.user) {
        setTimeout(async () => {
          await supabase.from('project_members').insert(addProjectIds.map(pid => ({ project_id: pid, user_id: signUpData.user!.id })));
        }, 2000);
      }
      toast({ title: 'Usuário criado!', description: 'Um e-mail de confirmação foi enviado.' });
      setAddOpen(false);
      setAddEmail(''); setAddPassword(''); setAddName(''); setAddRole('social_media'); setAddProjectIds([]);
      setTimeout(() => fetchUsers(), 2500);
      setTimeout(() => fetchPendingUsersCount(), 3500);
    }
    setAdding(false);
  };

  const initials = (name: string | null) =>
    name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??';

  const filtered = users
    .filter(u => {
      const matchSearch = !search || u.display_name?.toLowerCase().includes(search.toLowerCase());
      const matchRole = filterRole === 'all' || u.role === filterRole;
      return matchSearch && matchRole;
    })
    .sort((a, b) => {
      if (a.approved !== b.approved) return a.approved ? 1 : -1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <>
      <TopBar
        title="Equipe"
        subtitle="Gerencie os membros da plataforma"
        actions={
          isAdmin ? (
            <Button onClick={() => setAddOpen(true)} className="btn-action-primary" size="sm">
              <UserPlus size={16} className="mr-1.5" />
              Novo membro
            </Button>
          ) : <></>
        }
      />
      <div className="p-6 max-w-3xl space-y-5">
        {/* Back */}
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} />
          Voltar para configurações
        </button>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
            <Input
              placeholder="Buscar por nome..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="h-9 w-40 text-xs">
              <SelectValue placeholder="Cargo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os cargos</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="moderator">Gestor</SelectItem>
              <SelectItem value="social_media">Social Media</SelectItem>
              <SelectItem value="client">Cliente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Users list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-secondary/10 rounded-xl border-2 border-dashed border-border">
            <Shield className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium px-1">{filtered.length} membros</p>
            {filtered.map(u => (
              <div
                key={u.user_id}
                className={`flex items-center gap-3 p-3 rounded-xl border bg-card transition-colors ${!u.approved ? 'border-amber-500/40 bg-amber-500/5' : 'border-border hover:border-primary/20 shadow-sm'}`}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-primary text-xs font-bold">{initials(u.display_name)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">{u.display_name ?? 'Sem nome'}</p>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${roleBadgeVariant[u.role]}`}>
                      {roleLabels[u.role]}
                    </span>
                    {!u.approved && (
                      <span className="text-[9px] font-bold uppercase bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded border border-amber-500/20">
                        Pendente
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock size={10} />
                      Desde {format(new Date(u.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </span>
                    {u.project_ids.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        • {u.project_ids.length} cliente{u.project_ids.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!u.approved && isAdmin ? (
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 text-xs border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/10"
                        onClick={() => handleApprove(u)}
                      >
                        <CheckCircle2 size={12} />
                        Aprovar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 text-xs border-destructive/20 text-destructive hover:bg-destructive/10"
                        onClick={() => confirmDelete(() => handleDelete(u.user_id), `"${u.display_name || 'este usuário'}"`)}
                      >
                        <XCircle size={12} />
                        Rejeitar
                      </Button>
                    </div>
                  ) : isAdmin ? (
                    <div className="flex gap-0.5">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(u)}>
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => confirmDelete(() => handleDelete(u.user_id), `"${u.display_name || 'este usuário'}"`)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={open => !open && setEditUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar membro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Cargo</Label>
              <Select value={editRole} onValueChange={val => { setEditRole(val); if (val === 'admin') setEditProjectIds(projects.map(p => p.id)); }}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
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
                <p className="text-xs text-muted-foreground">Admins têm acesso a todos os clientes.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto rounded-md border border-border p-2">
                  {projects.map(p => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox
                        checked={editProjectIds.includes(p.id)}
                        onCheckedChange={checked => setEditProjectIds(prev => checked ? [...prev, p.id] : prev.filter(id => id !== p.id))}
                      />
                      <span className="truncate text-foreground">{p.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo membro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input placeholder="Nome completo" value={addName} onChange={e => setAddName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input type="email" placeholder="email@exemplo.com" value={addEmail} onChange={e => setAddEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Senha</Label>
              <Input type="password" placeholder="Mínimo 6 caracteres" value={addPassword} onChange={e => setAddPassword(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Cargo</Label>
              <Select value={addRole} onValueChange={val => { setAddRole(val); if (val === 'admin') setAddProjectIds(projects.map(p => p.id)); }}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
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
                <p className="text-xs text-muted-foreground">Admins têm acesso a todos os clientes.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto rounded-md border border-border p-2">
                  {projects.map(p => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox
                        checked={addProjectIds.includes(p.id)}
                        onCheckedChange={checked => setAddProjectIds(prev => checked ? [...prev, p.id] : prev.filter(id => id !== p.id))}
                      />
                      <span className="truncate text-foreground">{p.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={adding}>{adding ? 'Criando...' : 'Criar membro'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog />
    </>
  );
};

export default SettingsTeamPage;
