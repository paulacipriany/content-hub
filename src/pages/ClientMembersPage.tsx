import { useState, useEffect } from 'react';
import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useClientFromUrl } from '@/hooks/useClientFromUrl';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserPlus, Trash2, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface MemberWithProfile {
  id: string;
  user_id: string;
  created_at: string;
  profile?: { display_name: string | null; user_id: string } | null;
  role?: string | null;
}

const ClientMembersPage = () => {
  useClientFromUrl();
  const { selectedProject } = useApp();
  const { user, role: currentUserRole } = useAuth();
  const { toast } = useToast();

  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MemberWithProfile | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const isAdmin = currentUserRole === 'admin';
  const isOwner = selectedProject?.owner_id === user?.id;
  const canManage = isAdmin || isOwner;

  const fetchMembers = async () => {
    if (!selectedProject) return;
    setLoading(true);

    // Fetch project members
    const { data: memberRows } = await supabase
      .from('project_members')
      .select('*')
      .eq('project_id', selectedProject.id)
      .order('created_at', { ascending: true });

    // Collect all user IDs (members + owner)
    const memberUserIds = (memberRows ?? []).map(m => m.user_id);
    const allUserIds = [...new Set([selectedProject.owner_id, ...memberUserIds])];

    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from('profiles').select('user_id, display_name, avatar_url').in('user_id', allUserIds),
      supabase.from('user_roles').select('user_id, role').in('user_id', allUserIds),
    ]);

    const profileMap = new Map((profiles ?? []).map(p => [p.user_id, p]));
    const roleMap = new Map((roles ?? []).map(r => [r.user_id, r.role]));

    // Build members list: owner first, then other members
    const allMembers: MemberWithProfile[] = [];

    // Add owner as first member
    allMembers.push({
      id: 'owner',
      user_id: selectedProject.owner_id,
      created_at: selectedProject.created_at,
      profile: profileMap.get(selectedProject.owner_id) ?? null,
      role: roleMap.get(selectedProject.owner_id) ?? null,
      isOwner: true,
    });

    // Add other members (excluding owner if duplicated)
    (memberRows ?? []).forEach(m => {
      if (m.user_id !== selectedProject.owner_id) {
        allMembers.push({
          ...m,
          profile: profileMap.get(m.user_id) ?? null,
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

    // Build query based on provided fields
    let query = supabase.from('profiles').select('user_id, display_name');
    
    if (searchName.trim() && searchEmail.trim()) {
      query = query.or(`display_name.ilike.%${searchName.trim()}%`);
    } else if (searchName.trim()) {
      query = query.ilike('display_name', `%${searchName.trim()}%`);
    } else if (searchEmail.trim()) {
      // Search by display_name that might contain email
      query = query.ilike('display_name', `%${searchEmail.trim()}%`);
    }

    const { data: profileMatch } = await query.limit(1).single();

    if (!profileMatch) {
      toast({ title: 'Usuário não encontrado', description: 'Verifique o nome e tente novamente.', variant: 'destructive' });
      setAdding(false);
      return;
    }

    const exists = members.find(m => m.user_id === profileMatch.user_id);
    if (exists) {
      toast({ title: 'Já é membro', description: 'Este usuário já está vinculado a este cliente.', variant: 'destructive' });
      setAdding(false);
      return;
    }

    const { error } = await supabase.from('project_members').insert({
      project_id: selectedProject.id,
      user_id: profileMatch.user_id,
    } as any);

    if (error) {
      toast({ title: 'Erro ao adicionar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Usuário adicionado!' });
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
    toast({ title: 'Usuário removido' });
    await fetchMembers();
  };

  if (!selectedProject) return null;

  const roleLabels: Record<string, string> = {
    admin: 'Admin',
    moderator: 'Gestor',
    social_media: 'Social Media',
    client: 'Cliente',
  };

  return (
    <>
      <TopBar 
        title="Usuários" 
        subtitle={`Gerenciar acessos de ${selectedProject.name}`}
        actions={
          canManage ? (
            <Button 
              onClick={() => setAddDialogOpen(true)}
              size="sm"
              style={{ backgroundColor: 'var(--client-500, hsl(var(--primary)))', color: 'var(--client-500-contrast, hsl(var(--primary-foreground)))' }}
            >
              <UserPlus size={16} className="mr-1.5" />
              Adicionar usuário
            </Button>
          ) : <></>
        }
      />
      <div className="p-6 max-w-2xl space-y-6">
        {/* Members list */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">
            Membros ({members.length})
          </h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum usuário vinculado a este cliente.</p>
          ) : (
            <div className="space-y-2">
              {members.map(member => {
                const name = member.profile?.display_name ?? 'Usuário';
                const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors"
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'var(--client-100, hsl(var(--primary) / 0.1))' }}
                    >
                      <span className="text-xs font-semibold" style={{ color: 'var(--client-600, hsl(var(--primary)))' }}>
                        {initials}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Shield size={10} />
                        {member.role ? roleLabels[member.role] ?? member.role : 'Sem role'}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">
                      {new Date(member.created_at).toLocaleDateString('pt-BR')}
                    </span>
                    {canManage && (
                      <button
                        onClick={() => setDeleteTarget(member)}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors flex-shrink-0"
                        title="Remover"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus size={18} style={{ color: 'var(--client-500, hsl(var(--primary)))' }} />
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
                style={{ backgroundColor: 'var(--client-500, hsl(var(--primary)))', color: 'var(--client-500-contrast, hsl(var(--primary-foreground)))' }}
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
              Remover "{deleteTarget?.profile?.display_name ?? 'Usuário'}" deste cliente? O usuário perderá acesso.
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
