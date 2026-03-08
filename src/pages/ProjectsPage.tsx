import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, Plus, Pencil, Trash2, X, Check, ImagePlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { STATUS_LABELS, STATUS_COLORS, WorkflowStatus, Platform } from '@/data/types';
import { cn } from '@/lib/utils';
import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PlatformSelector, platformIcon } from '@/components/content/PlatformIcons';
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

const uploadLogo = async (projectId: string, file: File): Promise<string | null> => {
  const ext = file.name.split('.').pop();
  const path = `${projectId}.${ext}`;
  const { error } = await supabase.storage.from('client-logos').upload(path, file, { upsert: true });
  if (error) return null;
  const { data: { publicUrl } } = supabase.storage.from('client-logos').getPublicUrl(path);
  return publicUrl;
};

const LogoUploadButton = ({ logoUrl, onUpload, uploading }: { logoUrl?: string | null; onUpload: (file: File) => void; uploading: boolean }) => {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="w-14 h-14 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden hover:border-primary/40 transition-colors flex-shrink-0"
      >
        {uploading ? (
          <Loader2 size={18} className="animate-spin text-primary" />
        ) : logoUrl ? (
          <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
        ) : (
          <ImagePlus size={18} className="text-muted-foreground" />
        )}
      </button>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />
      <span className="text-xs text-muted-foreground">{logoUrl ? 'Clique para trocar' : 'Adicionar logo'}</span>
    </div>
  );
};

const ProjectsPage = () => {
  const { contents, projects, refetch, setSelectedProject } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [newLogoUrl, setNewLogoUrl] = useState<string | null>(null);
  const [uploadingNew, setUploadingNew] = useState(false);
  const [newPlatforms, setNewPlatforms] = useState<Platform[]>([]);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState<string | null>(null);
  const [uploadingEdit, setUploadingEdit] = useState(false);
  const [editPlatforms, setEditPlatforms] = useState<Platform[]>([]);

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleNewLogoUpload = async (file: File) => {
    setUploadingNew(true);
    const tempId = crypto.randomUUID();
    const url = await uploadLogo(tempId, file);
    if (url) setNewLogoUrl(url);
    setUploadingNew(false);
  };

  const handleCreate = async () => {
    if (!newName.trim() || !user) return;
    const { error } = await supabase.from('projects').insert({
      name: newName.trim(),
      color: newColor,
      owner_id: user.id,
      logo_url: newLogoUrl,
      platforms: newPlatforms.length > 0 ? newPlatforms : ['instagram'],
    } as any);
    if (error) {
      toast({ title: 'Erro ao criar cliente', description: error.message, variant: 'destructive' });
    } else {
      setNewName('');
      setNewLogoUrl(null);
      setNewPlatforms([]);
      setShowCreate(false);
      await refetch();
    }
  };

  const startEdit = (project: any) => {
    setEditingId(project.id);
    setEditName(project.name);
    setEditColor(project.color);
    setEditLogoUrl(project.logo_url ?? null);
    setEditPlatforms(project.platforms ?? []);
  };

  const handleEditLogoUpload = async (file: File) => {
    if (!editingId) return;
    setUploadingEdit(true);
    const url = await uploadLogo(editingId, file);
    if (url) setEditLogoUrl(url);
    setUploadingEdit(false);
  };

  const handleUpdate = async () => {
    if (!editingId || !editName.trim()) return;
    const { error } = await supabase.from('projects').update({
      name: editName.trim(),
      color: editColor,
      logo_url: editLogoUrl,
      platforms: editPlatforms.length > 0 ? editPlatforms : ['instagram'],
    } as any).eq('id', editingId);
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
            <LogoUploadButton logoUrl={newLogoUrl} onUpload={handleNewLogoUpload} uploading={uploadingNew} />
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
              <label className="relative w-6 h-6 rounded-full border-2 border-dashed border-border cursor-pointer overflow-hidden hover:border-primary/40 transition-colors" title="Escolher cor">
                <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
                <span className="w-full h-full block rounded-full" style={{ backgroundColor: newColor }} />
              </label>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Redes sociais</span>
              <PlatformSelector selected={newPlatforms} onChange={setNewPlatforms} size={36} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate}>Criar</Button>
              <Button size="sm" variant="outline" onClick={() => { setShowCreate(false); setNewLogoUrl(null); }}>Cancelar</Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => {
            const projectContents = contents.filter(c => c.project_id === project.id);
            const isEditing = editingId === project.id;

            return (
              <div
                key={project.id}
                className="bg-card border border-border rounded-xl p-5 text-left hover:shadow-md hover:border-primary/20 transition-all group relative"
              >
                {/* Action buttons */}
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
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
                    <LogoUploadButton logoUrl={editLogoUrl} onUpload={handleEditLogoUpload} uploading={uploadingEdit} />
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
                    <label className="relative w-5 h-5 rounded-full border-2 border-dashed border-border cursor-pointer overflow-hidden hover:border-primary/40 transition-colors inline-block -mt-1 ml-1" title="Escolher cor">
                      <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
                      <span className="w-full h-full block rounded-full" style={{ backgroundColor: editColor }} />
                    </label>
                    <div className="space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground">Redes sociais</span>
                      <PlatformSelector selected={editPlatforms} onChange={setEditPlatforms} size={32} />
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
                    onClick={() => { setSelectedProject(project); navigate(`/clients/${project.id}/dashboard`); }}
                    className="w-full text-left"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0" style={{ backgroundColor: project.color + '20' }}>
                        {(project as any).logo_url ? (
                          <img src={(project as any).logo_url} alt={project.name} className="w-full h-full object-cover" />
                        ) : (
                          <FolderOpen size={20} style={{ color: project.color }} />
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{project.name}</h3>
                        <p className="text-xs text-muted-foreground">{projectContents.length} conteúdos</p>
                      </div>
                    </div>

                    {/* Platform icons */}
                    {(project as any).platforms && (project as any).platforms.length > 0 && (
                      <div className="mb-3">
                        {platformIcon((project as any).platforms as Platform[], 16)}
                      </div>
                    )}

                    {/* Status breakdown */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {(['idea', 'production', 'review', 'approval-internal', 'approval-client', 'scheduled', 'published'] as WorkflowStatus[]).map(s => {
                        const count = projectContents.filter(c => c.status === s).length;
                        if (count === 0) return null;
                        return (
                          <span
                            key={s}
                            className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold text-primary-foreground", STATUS_COLORS[s])}
                          >
                            {STATUS_LABELS[s]} {count}
                          </span>
                        );
                      })}
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3 h-1.5 bg-secondary rounded-full overflow-hidden flex">
                      {(['idea', 'production', 'review', 'approval-internal', 'approval-client', 'scheduled', 'published'] as WorkflowStatus[]).map(s => {
                        const count = projectContents.filter(c => c.status === s).length;
                        if (count === 0 || projectContents.length === 0) return null;
                        const pct = (count / projectContents.length) * 100;
                        return (
                          <div
                            key={s}
                            className={cn("h-full transition-all", STATUS_COLORS[s])}
                            style={{ width: `${pct}%` }}
                            title={`${STATUS_LABELS[s]}: ${count}`}
                          />
                        );
                      })}
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
