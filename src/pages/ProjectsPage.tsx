import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const COLORS = ['#F97316', '#8B5CF6', '#10B981', '#3B82F6', '#EF4444', '#EC4899', '#14B8A6', '#F59E0B'];

const ProjectsPage = () => {
  const { contents, projects, refetch } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLORS[0]);

  const handleCreate = async () => {
    if (!newName.trim() || !user) return;
    const { error } = await supabase.from('projects').insert({
      name: newName.trim(),
      color: newColor,
      owner_id: user.id,
    });
    if (error) {
      toast({ title: 'Erro ao criar projeto', description: error.message, variant: 'destructive' });
    } else {
      setNewName('');
      setShowCreate(false);
      await refetch();
    }
  };

  return (
    <>
      <TopBar title="Projetos" subtitle="Gerencie seus projetos e campanhas" />
      <div className="p-6">
        <div className="flex justify-end mb-4">
          <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Novo projeto
          </Button>
        </div>

        {showCreate && (
          <div className="bg-card border border-border rounded-xl p-5 mb-4 space-y-3">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Nome do projeto..."
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
            return (
              <button
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="bg-card border border-border rounded-xl p-5 text-left hover:shadow-md hover:border-primary/20 transition-all group"
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
            );
          })}
          {projects.length === 0 && (
            <div className="col-span-full text-center py-20 text-muted-foreground">
              <FolderOpen size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-sm">Nenhum projeto ainda.</p>
              <p className="text-xs mt-1">Crie seu primeiro projeto para organizar seus conteúdos!</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ProjectsPage;
