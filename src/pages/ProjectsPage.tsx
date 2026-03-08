import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const COLORS = ['#F97316', '#8B5CF6', '#10B981', '#3B82F6', '#EF4444', '#EC4899', '#14B8A6', '#F59E0B'];

const ProjectsPage = () => {
  const { contents, projects, refetch, setSelectedProject } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLORS[0]);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newName.trim() || !user) return;
    const { error } = await supabase.from('projects').insert({
      name: newName.trim(),
      color: newColor,
      owner_id: user.id,
    });
    if (error) {
      toast({ title: 'Erro ao criar cliente', description: error.message, variant: 'destructive' });
    } else {
      setNewName('');
      setShowCreate(false);
      await refetch();
    }
  };

  const startEdit = (project: { id: string; name: string; color: string }) => {
    setEditingId(project.id);
    setEditName(project.name);
    setEditColor(project.color);
  };

  const handleUpdate = async () => {
    if (!editingId || !editName.trim()) return;
    const { error } = await supabase.from('projects').update({ name: editName.trim(), color: editColor }).eq('id', editingId);
    if (error) {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    } else {
      setEditingId(null);
      await refetch();
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('projects').delete().eq('id', deleteId);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } else {
      setDeleteId(null);
      await refetch();
    }
  };

  return (
    <>
      <TopBar title="Clientes" subtitle="Gerencie seus clientes e campanhas" />
      <div className="p-6">
        <div className="flex justify-end mb-4">
          <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Novo cliente
          </Button>
        </div>

        {showCreate && (
          <div className="bg-card border border-border rounded-xl p-5 mb-4 space-y-3">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Nome do cliente..."
              className="w-full h-9 px-3 rounded-md bg-secondary text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/20"
              autoFocus
            />
            <div className="flex items-center gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className="w-6 h-6 rounded-full border-2 transition-all"
                  style={{ backgroundColor: c, borderColor: newColor === c ? 'var(--foreground)' : 'transparent' }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate}>Criar</Button>
              <Button size="sm" variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => {
            const projectContents = contents.filter(c => c.project_id === project.id);
            const published = projectContents.filter(c => c.status === 'published').length;
            const isEditing = editingId === project.id;

            return (
              <div
                key={project.id}
                className="bg-card border border-border rounded-xl p-5 text-left hover:shadow-md hover:border-primary/20 transition-all group relative"
              >
                {/* Action buttons */}
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); startEdit(project); }}
                    className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    title="Editar"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteId(project.id); }}
                    className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Excluir"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {isEditing ? (
                  <div className="space-y-3" onClick={e => e.stopPropagation()}>
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="w-full h-9 px-3 rounded-md bg-secondary text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/20"
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      {COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => setEditColor(c)}
                          className="w-5 h-5 rounded-full border-2 transition-all"
                          style={{ backgroundColor: c, borderColor: editColor === c ? 'var(--foreground)' : 'transparent' }}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="gap-1" onClick={handleUpdate}>
                        <Check size={14} /> Salvar
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => setEditingId(null)}>
                        <X size={14} /> Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setSelectedProject(project); navigate(`/clients/${project.id}/contents`); }}
                    className="w-full text-left"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: project.color + '20' }}>
                        <FolderOpen size={20} style={{ color: project.color }} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{project.name}</h3>
                        <p className="text-xs text-muted-foreground">{projectContents.length} conteúdos</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{published} publicados</span>
                      <span>{projectContents.length - published} em andamento</span>
                    </div>
                    <div className="mt-3 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-status-published transition-all"
                        style={{ width: `${projectContents.length > 0 ? (published / projectContents.length) * 100 : 0}%` }}
                      />
                    </div>
                  </button>
                )}
              </div>
            );
          })}
          {projects.length === 0 && (
            <div className="col-span-full text-center py-20 text-muted-foreground">
              <FolderOpen size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-sm">Nenhum cliente ainda.</p>
              <p className="text-xs mt-1">Crie seu primeiro cliente para organizar seus conteúdos!</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Todos os conteúdos vinculados a este cliente também serão afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ProjectsPage;
