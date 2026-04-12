import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useClientFromUrl } from '@/hooks/useClientFromUrl';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { UserPlus, Trash2, Pencil, Crown, ArrowLeft, Clock, Search, Filter, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MemberWithProfile {
  id: string;
  user_id: string;
  created_at: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
  isOwner: boolean;
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

const ClientMembersPage = () => {
  useClientFromUrl();
  const { selectedProject } = useApp();
  const { user, role: currentUserRole } = useAuth();
  const navigate = useNavigate();

  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<MemberWithProfile | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [adding, setAdding] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');

  const isAdmin = currentUserRole === 'admin';
  const isOwner = selectedProject?.owner_id === user?.id;
  const canManage = isAdmin || isOwner;

  const fetchMembers = async () => {
    if (!selectedProject) return;
    setLoading(true);

    const { data: memberRows } = await supabase
      .from('project_members')
      .select('*')
      .eq('project_id', selectedProject.id)
      .order('created_at', { ascending: true });

    const memberUserIds = (memberRows ?? []).map(m => m.user_id);
    const allUserIds = [...new Set([selectedProject.owner_id, ...memberUserIds])];

    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from('profiles').select('user_id, display_name, avatar_url').in('user_id', allUserIds),
      supabase.from('user_roles').select('user_id, role').in('user_id', allUserIds),
    ]);

    const profileMap = new Map((profiles ?? []).map(p => [p.user_id, p]));
    const roleMap = new Map((roles ?? []).map(r => [r.user_id, r.role]));

    const allMembers: MemberWithProfile[] = [];

    allMembers.push({
      id: 'owner',
      user_id: selectedProject.owner_id,
      created_at: selectedProject.created_at,
      display_name: profileMap.get(selectedProject.owner_id)?.display_name ?? null,
      avatar_url: profileMap.get(selectedProject.owner_id)?.avatar_url ?? null,
      role: roleMap.get(selectedProject.owner_id) ?? null,
      isOwner: true,
    });

    (memberRows ?? []).forEach(m => {
      if (m.user_id !== selectedProject.owner_id) {
        allMembers.push({
          id: m.id,
          user_id: m.user_id,
          created_at: m.created_at,
          display_name: profileMap.get(m.user_id)?.display_name ?? null,
          avatar_url: profileMap.get(m.user_id)?.avatar_url ?? null,
          role: roleMap.get(m.user_id) ?? null,
          isOwner: false,
        });
      }
    });

    setMembers(allMembers);
    setLoading(false);
  };

  useEffect(() => { fetchMembers(); }, [selectedProject?.id]);

  const handleAdd = async () => {
    if ((!searchName.trim() && !searchEmail.trim()) || !selectedProject || !user) return;
    setAdding(true);

    let query = supabase.from('profiles').select('user_id, display_name');
    if (searchName.trim()) {
      query = query.ilike('display_name', `%${searchName.trim()}%`);
    } else if (searchEmail.trim()) {
      query = query.ilike('display_name', `%${searchEmail.trim()}%`);
    }

    const { data: profileMatch } = await query.limit(1).single();

    if (!profileMatch) {
      toast.error('Usuário não encontrado. Verifique o nome e tente novamente.');
      setAdding(false);
      return;
    }

    const exists = members.find(m => m.user_id === profileMatch.user_id);
    if (exists) {
      toast.error('Este usuário já está vinculado a este cliente.');
      setAdding(false);
      return;
    }

    const { error } = await supabase.from('project_members').insert({
      project_id: selectedProject.id,
      user_id: profileMatch.user_id,
    } as any);

    if (error) {
      toast.error('Erro ao adicionar: ' + error.message);
    } else {
      toast.success('Usuário adicionado!');
      setSearchName('');
      setSearchEmail('');
      setAddDialogOpen(false);
      await fetchMembers();
    }
    setAdding(false);
  };

  const handleRemove = async () => {
    if (!deleteTarget) return;
    await supabase.from('project_members').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    toast.success('Usuário removido');
    await fetchMembers();
  };

  if (!selectedProject) return null;

  const initials = (name: string | null) =>
    name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??';

  const filteredMembers = members.filter(m => {
    const matchesSearch = !searchTerm || m.display_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || m.role === filterRole;
    return matchesSearch && matchesRole;
  }).sort((a, b) => {
    // Owner always first
    if (a.isOwner) return -1;
    if (b.isOwner) return 1;
    if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortBy === 'name') return (a.display_name ?? '').localeCompare(b.display_name ?? '');
    return 0;
  });

  return (
    <>
      <TopBar 
        title="Acessos" 
        subtitle={selectedProject.name}
        actions={
          canManage ? (
            <Button onClick={() => setAddDialogOpen(true)} className="btn-action-primary">
              <UserPlus size={16} className="mr-1.5" />
              ADICIONAR USUÁRIO
            </Button>
          ) : <></>
        }
      />
      <div className="p-6 space-y-6">
        <button
          onClick={() => navigate(`/clients/${selectedProject.id}/settings`)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} />
          Voltar para configurações
        </button>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-secondary/30 p-4 rounded-xl border border-border">
          <div className="relative">
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
              {filteredMembers.length} membro{filteredMembers.length !== 1 ? 's' : ''} encontrado{filteredMembers.length !== 1 ? 's' : ''}
            </div>
            <div className="grid grid-cols-1 gap-2">
              {filteredMembers.map(member => {
                const name = member.display_name ?? 'Usuário';
                const role = member.role ?? 'client';
                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover:border-primary/20 shadow-sm transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {member.avatar_url ? (
                        <img src={member.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <span className="text-primary text-xs font-bold">{initials(member.display_name)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">{name}</p>
                        {member.isOwner && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            <Crown size={10} />
                            Dono
                          </span>
                        )}
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shadow-sm ${roleBadgeVariant[role] ?? 'bg-muted text-muted-foreground'}`}>
                          {roleLabels[role] ?? role}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock size={10} />
                          Desde {format(new Date(member.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {canManage && !member.isOwner && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteTarget(member)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredMembers.length === 0 && (
                <div className="text-center py-16 bg-secondary/10 rounded-xl border-2 border-dashed border-border">
                  <Filter className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhum membro corresponde aos filtros aplicados.</p>
                  <Button variant="link" onClick={() => { setSearchTerm(''); setFilterRole('all'); }} className="text-xs mt-1">
                    Limpar filtros
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus size={18} className="text-primary" />
              Adicionar usuário
            </DialogTitle>
            <DialogDescription>
              Busque pelo nome do usuário cadastrado na plataforma para vinculá-lo a este cliente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Nome</label>
                <Input
                  placeholder="Digite o nome do usuário..."
                  value={searchName}
                  onChange={e => setSearchName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">E-mail</label>
                <Input
                  type="email"
                  placeholder="Digite o e-mail do usuário..."
                  value={searchEmail}
                  onChange={e => setSearchEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Preencha pelo menos um campo para buscar o usuário cadastrado na plataforma.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddDialogOpen(false)} disabled={adding}>
                Cancelar
              </Button>
              <Button
                onClick={handleAdd}
                disabled={adding || (!searchName.trim() && !searchEmail.trim())}
              >
                {adding ? 'Adicionando...' : 'Adicionar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Remover "{deleteTarget?.display_name ?? 'Usuário'}" deste cliente? O usuário perderá acesso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ClientMembersPage;