import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/contexts/AppContext';
import { useClientFromUrl } from '@/hooks/useClientFromUrl';
import { CONTENT_TYPE_LABELS, PLATFORM_LABELS, ContentType, Platform } from '@/data/types';
import { platformIcon } from '@/components/content/PlatformIcons';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import CreateContentDialog from '@/components/content/CreateContentDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';


const contentTypeBadgeColors: Record<string, string> = {
  stories: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  post: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  feed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  reels: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  carousel: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  video: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  shorts: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  image: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
};

const IdeasBankPage = () => {
  useClientFromUrl();
  const { projectContents, selectedProject, setSelectedContent, deleteContent } = useApp();
  const { toast } = useToast();
  const { confirmDelete, ConfirmDialog } = useConfirmDelete();

  const ideas = projectContents.filter(c => c.status === 'idea-bank');

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const idea = ideas.find(i => i.id === id);
    confirmDelete(async () => {
      await deleteContent(id);
      toast({ title: 'Ideia excluída' });
    }, idea ? `"${idea.title}"` : 'esta ideia');
  };

  return (
    <>
      <TopBar
        title="Banco de Ideias"
        subtitle="Ideias de conteúdo para produção"
        actions={
          <CreateContentDialog
            defaultProjectId={selectedProject?.id}
            defaultStatus="idea-bank"
            trigger={
              <Button
                size="sm"
                className="gap-1.5 h-9"
                style={{ backgroundColor: '#ff88db', color: '#000000' }}
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Adicionar ideia</span>
              </Button>
            }
          />
        }
      />
      <div className="p-6">
        <div className="border border-border overflow-hidden bg-card">
          <div className="grid grid-cols-[1fr_180px_180px_80px] items-center px-4 py-2.5 border-b border-border bg-secondary/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <div>Título do Conteúdo</div>
            <div>Formato</div>
            <div>Plataformas</div>
            <div className="text-center">Ações</div>
          </div>

          {ideas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <p className="text-sm">Nenhuma ideia cadastrada ainda.</p>
              <p className="text-xs mt-1">Clique em "Adicionar ideia" para começar.</p>
            </div>
          ) : (
            ideas.map(idea => {
              const platforms = Array.isArray(idea.platform) ? idea.platform : [idea.platform];
              

              return (
                <div
                  key={idea.id}
                  className="grid grid-cols-[1fr_180px_180px_80px] items-center px-4 py-3 border-b border-border last:border-b-0 hover:bg-secondary/30 transition-colors"
                >
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-foreground truncate block">{idea.title}</span>
                    {idea.description && (
                      <span className="text-xs text-muted-foreground truncate block mt-0.5">
                        {idea.description.replace(/<[^>]*>/g, '')}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <span className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-md",
                      contentTypeBadgeColors[idea.content_type] || 'bg-secondary text-foreground'
                    )}>
                      {CONTENT_TYPE_LABELS[idea.content_type as ContentType] || idea.content_type}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {platformIcon(platforms, 14, true)}
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => setSelectedContent(idea)}
                      className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, idea.id)}
                      className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      <ConfirmDialog />
    </>
  );
};

export default IdeasBankPage;
