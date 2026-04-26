import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useClientFromUrl } from '@/hooks/useClientFromUrl';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { FileText, Plus, Trash2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';

interface Script {
  id: string;
  title: string;
  updated_at: string;
  created_by: string;
}

const ScriptsPage = () => {
  useClientFromUrl();
  const navigate = useNavigate();
  const { selectedProject } = useApp();
  const { user } = useAuth();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { confirmDelete, ConfirmDialog } = useConfirmDelete();

  const fetchScripts = async () => {
    if (!selectedProject) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('project_scripts' as any)
      .select('id, title, updated_at, created_by')
      .eq('project_id', selectedProject.id)
      .order('updated_at', { ascending: false });
    if (!error && data) setScripts(data as any);
    setLoading(false);
  };

  useEffect(() => {
    fetchScripts();
  }, [selectedProject?.id]);

  const createScript = async () => {
    if (!selectedProject || !user) return;
    const { data, error } = await supabase
      .from('project_scripts' as any)
      .insert({
        project_id: selectedProject.id,
        title: 'Documento sem título',
        content: {},
        created_by: user.id,
      } as any)
      .select()
      .single();
    if (error) {
      toast.error('Erro ao criar roteiro: ' + error.message);
      return;
    }
    navigate(`/clients/${selectedProject.id}/scripts/${(data as any).id}`);
  };

  const deleteScript = (id: string) => {
    confirmDelete(async () => {
      const { error } = await supabase.from('project_scripts' as any).delete().eq('id', id);
      if (error) {
        toast.error('Erro ao excluir');
        return;
      }
      toast.success('Roteiro excluído');
      setScripts(prev => prev.filter(s => s.id !== id));
    }, 'este roteiro');
  };

  if (!selectedProject) return null;

  const filtered = scripts.filter(s => s.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <TopBar
        title="Roteiros"
        subtitle="Documentos de texto do projeto"
        actions={
          <Button onClick={createScript} className="gap-2">
            <Plus size={16} />
            Novo roteiro
          </Button>
        }
      />
      <div className="p-6 space-y-4">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar roteiros..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-44 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <FileText size={28} className="text-primary" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">
              {search ? 'Nenhum roteiro encontrado' : 'Nenhum roteiro ainda'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {search ? 'Tente outros termos' : 'Crie seu primeiro documento de roteiro'}
            </p>
            {!search && (
              <Button onClick={createScript} className="gap-2">
                <Plus size={16} />
                Criar roteiro
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(script => (
              <div
                key={script.id}
                className="group relative bg-card border border-border rounded-xl overflow-hidden hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
                onClick={() => navigate(`/clients/${selectedProject.id}/scripts/${script.id}`)}
              >
                <div className="h-32 bg-muted/50 border-b border-border flex items-center justify-center">
                  <FileText size={36} className="text-muted-foreground/40" />
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-foreground truncate">{script.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Editado {format(new Date(script.updated_at), "d 'de' MMM", { locale: ptBR })}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteScript(script.id); }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-md bg-background/80 backdrop-blur opacity-0 group-hover:opacity-100 flex items-center justify-center text-muted-foreground hover:text-destructive transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <ConfirmDialog />
    </>
  );
};

export default ScriptsPage;
