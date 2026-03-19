import { useEffect, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Trash2, Pencil, UserPlus, CheckCircle2, Clock, XCircle, Filter, Search, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';
import { useApp } from '@/contexts/AppContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SimpleProject { id: string; name: string; color: string; }

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
  const { fetchPendingUsersCount } = useApp();

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');

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

  // Approve dialog
  const [approveUser, setApproveUser] = useState<UserRow | null>(null);
  const [approveRole, setApproveRole] = useState<string>('client');
  const [approveProjectIds, setApproveProjectIds] = useState<string[]>([]);
  const [approving, setApproving] = useState(false);

  // Reject dialog
  const [rejectUser, setRejectUser] = useState<UserRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const [profilesRes, rolesRes, membersRes] = await Promise.all([
      supabase.from('profiles').select('user_id, display_name, avatar_url, approved, created_at'),
      supabase.from('user_roles').select('user_id, role'),
      supabase.from('project_members').select('user_id, project_id')
    ]);

    if (profilesRes.data && rolesRes.data) {
      const roleMap = new Map(rolesRes.data.map(r => [r.user_id, r.role]));
      const membersMap = new Map<string, string[]>();
      
      membersRes.data?.forEach(m => {
        const uId = m.user_id;
        if (!membersMap.has(uId)) membersMap.set(uId, []);
        membersMap.get(uId)?.push(m.project_id);
      });

      const merged: UserRow[] = profilesRes.data.map(p => ({
        user_id: p.user_id,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        role: (roleMap.get(p.user_id) as UserRow['role']) ?? 'social_media',
        approved: p.approved ?? false,
        created_at: p.created_at ?? new Date().toISOString(),
        project_ids: membersMap.get(p.user_id) ?? []
      }));
      
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

  const handleDelete = async (userId: string) => {
    const { data, error } = await supabase.functions.invoke('admin-delete-user', {
      body: { user_id: userId }
    });
    const errorMessage = error?.message || data?.error;
    if (errorMessage) {
      console.error("Delete user error:", errorMessage);
      toast.error('Erro ao remover usuário: ' + errorMessage);
    } else {
      toast.success('Usuário removido');
      await fetchUsers();
      await fetchPendingUsersCount();
    }
  };

  const openEdit = async (u: UserRow) => {
    setEditUser(u);
    setEditName(u.display_name ?? '');
    setEditEmail('');
    setEditPassword('');
    setEditRole(u.role);
    setEditProjectIds(u.project_ids);
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setSaving(true);

    const [profileRes, roleRes] = await Promise.all([
      supabase.from('profiles').update({ display_name: editName, approved: true } as any).eq('user_id', editUser.user_id),
      editRole !== editUser.role
        ? supabase.from('user_roles').update({ role: editRole as any }).eq('user_id', editUser.user_id)
        : Promise.resolve({ error: null }),
    ]);

    if (editEmail || editPassword) {
      await supabase.functions.invoke('admin-update-user', {
        body: { user_id: editUser.user_id, email: editEmail || undefined, password: editPassword || undefined },
      });
    }

    const finalProjectIds = editRole === 'admin' ? projects.map(p => p.id) : editProjectIds;
    await supabase.from('project_members').delete().eq('user_id', editUser.user_id);
    if (finalProjectIds.length > 0) {
      await supabase.from('project_members').insert(
        finalProjectIds.map(pid => ({ project_id: pid, user_id: editUser.user_id }))
      );
    }

    if (profileRes.error || roleRes.error) {
      toast.error('Erro ao salvar alterações');
      setSaving(false);
      return;
    }

    toast.success('Usuário atualizado');
    setEditUser(null);
    setSaving(false);
    await fetchUsers();
    await fetchPendingUsersCount();
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
      setTimeout(() => fetchUsers(), 2500);
      setTimeout(() => fetchPendingUsersCount(), 3500);
    }
    setAdding(false);
  };

  const initials = (name: string | null) =>
    name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??';

  // Apply filters and sorting
  const filteredUsers = users.filter(u => {
    const matchesSearch = !searchTerm || u.display_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    // Admins always match any project filter
    const matchesProject = filterProject === 'all' || u.role === 'admin' || u.project_ids.includes(filterProject);
    return matchesSearch && matchesRole && matchesProject;
  }).sort((a, b) => {
    // Unapproved ALWAYS first
    if (a.approved !== b.approved) return a.approved ? 1 : -1;

    if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortBy === 'name') return (a.display_name ?? '').localeCompare(b.display_name ?? '');
    return 0;
  });

  return (
    <>
      <TopBar title="Usuários" subtitle="Gerencie todos os usuários da plataforma" />
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xl font-bold text-foreground">Gestão de Usuários</h2>
          <Button onClick={() => setAddOpen(true)} size="sm" className="gap-1.5 order-first sm:order-last">
            <UserPlus size={15} />
            Novo usuário
          </Button>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-secondary/30 p-4 rounded-xl border border-border">
          <div className="relative md:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
            <Input 
              placeholder="Buscar por nome..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="h-9 text-xs">
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-muted-foreground" />
                <SelectValue placeholder="Cargo" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os cargos</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="moderator">Gestor</SelectItem>
              <SelectItem value="social_media">Social Media</SelectItem>
              <SelectItem value="client">Cliente</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="h-9 text-xs">
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-muted-foreground" />
                <SelectValue placeholder="Cliente" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-9 text-xs">
              <div className="flex items-center gap-2">
                <ArrowUpDown size={14} className="text-muted-foreground" />
                <SelectValue placeholder="Ordenar por" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Mais recentes</SelectItem>
              <SelectItem value="oldest">Mais antigos</SelectItem>
              <SelectItem value="name">Nome (A-Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground font-medium px-2 py-1">
              {filteredUsers.length} usuários encontrados
            </div>
            <div className="grid grid-cols-1 gap-2">
              {filteredUsers.map(u => (
                <div key={u.user_id} className={`flex items-center gap-3 p-3 rounded-lg bg-card border transition-colors ${!u.approved ? 'border-amber-500/40 bg-amber-500/5' : 'border-border hover:border-primary/20 shadow-sm'}`}>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <span className="text-primary text-xs font-bold">{initials(u.display_name)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">{u.display_name ?? 'Sem nome'}</p>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shadow-sm ${roleBadgeVariant[u.role]}`}>
                        {roleLabels[u.role]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock size={10} />
                        Desde {format(new Date(u.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                      {u.project_ids.length > 0 && (
                        <span className="text-[10px] text-muted-foreground truncate">
                          • {u.project_ids.length} cliente{u.project_ids.length > 1 ? 's' : ''}
                        </span>
                      )}
                      {!u.approved && (
                        <span className="text-[10px] font-bold uppercase bg-amber-500/10 text-amber-600 px-1 py-0.5 rounded border border-amber-500/20 flex items-center gap-1">
                          Aguardando aprovação
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!u.approved ? (
                      <div className="flex gap-1 mr-2 px-3 border-r pr-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1 text-xs border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/10"
                          onClick={() => {
                            setApproveUser(u);
                            setApproveRole('client');
                            setApproveProjectIds([]);
                          }}
                        >
                          <CheckCircle2 size={13} />
                          Aprovar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1 text-xs border-destructive/20 text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            setRejectUser(u);
                            setRejectReason('');
                          }}
                        >
                          <XCircle size={13} />
                          Rejeitar
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-0.5">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(u)}>
                          <Pencil size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => confirmDelete(() => handleDelete(u.user_id), `"${u.display_name || 'este usuário'}"`)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <div className="text-center py-16 bg-secondary/10 rounded-xl border-2 border-dashed border-border">
                  <Filter className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhum usuário corresponde aos filtros aplicados.</p>
                  <Button variant="link" onClick={() => { setSearchTerm(''); setFilterRole('all'); setFilterProject('all'); }} className="text-xs mt-1">
                    Limpar todos os filtros
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Dialogs... (Edit, Add, Approve, Reject) */}
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
      {/* Approve Dialog */}
      <Dialog open={!!approveUser} onOpenChange={(open) => !open && setApproveUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Aprovar usuário — {approveUser?.display_name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Defina o tipo de conta e os clientes vinculados para aprovar este usuário.</p>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Tipo de conta</Label>
              <Select value={approveRole} onValueChange={(val) => {
                setApproveRole(val);
                if (val === 'admin') setApproveProjectIds(projects.map(p => p.id));
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
              {approveRole === 'admin' ? (
                <p className="text-xs text-muted-foreground">Admins têm acesso a todos os clientes automaticamente.</p>
              ) : (
                <>
                  <div className="space-y-2 max-h-40 overflow-y-auto rounded-md border border-border p-2">
                    {projects.map(p => (
                      <label key={p.id} className="flex items-center gap-2 cursor-pointer text-sm">
                        <Checkbox
                          checked={approveProjectIds.includes(p.id)}
                          onCheckedChange={(checked) => {
                            setApproveProjectIds(prev =>
                              checked ? [...prev, p.id] : prev.filter(id => id !== p.id)
                            );
                          }}
                        />
                        <span className="truncate text-foreground">{p.name}</span>
                      </label>
                    ))}
                    {projects.length === 0 && <p className="text-xs text-muted-foreground">Nenhum cliente cadastrado</p>}
                  </div>
                  {approveRole !== 'admin' && approveProjectIds.length === 0 && (
                    <p className="text-xs text-destructive">Selecione pelo menos um cliente para aprovar.</p>
                  )}
                </>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveUser(null)}>Cancelar</Button>
            <Button
              disabled={approving || (approveRole !== 'admin' && approveProjectIds.length === 0)}
              onClick={async () => {
                if (!approveUser) return;
                setApproving(true);

                // Update role
                await supabase.from('user_roles').update({ role: approveRole as any }).eq('user_id', approveUser.user_id);

                // Set approved
                await supabase.from('profiles').update({ approved: true } as any).eq('user_id', approveUser.user_id);

                // Sync project members
                const finalProjectIds = approveRole === 'admin' ? projects.map(p => p.id) : approveProjectIds;
                await supabase.from('project_members').delete().eq('user_id', approveUser.user_id);
                if (finalProjectIds.length > 0) {
                  await supabase.from('project_members').insert(
                    finalProjectIds.map(pid => ({ project_id: pid, user_id: approveUser.user_id }))
                  );
                }

                toast.success('Usuário aprovado com sucesso!');
                setApproveUser(null);
                setApproving(false);
                await fetchUsers();
                await fetchPendingUsersCount();
              }}
            >
              {approving ? 'Aprovando...' : 'Aprovar usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Reject Dialog */}
      <Dialog open={!!rejectUser} onOpenChange={(open) => !open && setRejectUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rejeitar usuário — {rejectUser?.display_name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Informe o motivo da rejeição. O usuário e seus dados serão removidos.</p>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="reject-reason">Motivo</Label>
              <textarea
                id="reject-reason"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Ex: Cadastro não autorizado, dados incorretos..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectUser(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={rejecting || !rejectReason.trim()}
              onClick={async () => {
                if (!rejectUser) return;
                setRejecting(true);

                // Remove user via edge function
                const { data, error } = await supabase.functions.invoke('admin-delete-user', {
                  body: { user_id: rejectUser.user_id }
                });

                const errorMessage = error?.message || data?.error;
                if (errorMessage) {
                  console.error("Reject user error:", errorMessage);
                  toast.error('Erro ao remover usuário: ' + errorMessage);
                  setRejecting(false);
                  return;
                }

                toast.success('Usuário rejeitado e removido.');
                setRejectUser(null);
                setRejecting(false);
                await fetchUsers();
                await fetchPendingUsersCount();
              }}
            >
              {rejecting ? 'Rejeitando...' : 'Rejeitar usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog />
    </>
  );
};

export default UsersPage;
