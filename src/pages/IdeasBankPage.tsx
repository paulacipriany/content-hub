import { useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/contexts/AppContext';
import { useClientFromUrl } from '@/hooks/useClientFromUrl';
import { CONTENT_TYPE_LABELS, PLATFORM_LABELS, ContentType, Platform } from '@/data/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Instagram, Facebook, Linkedin, Youtube, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import CreateContentDialog from '@/components/content/CreateContentDialog';

const platformIcons: Partial<Record<Platform, React.ElementType>> = {
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
  youtube: Youtube,
};

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
  const { projectContents, updateContentStatus, selectedProject, setSelectedContent } = useApp();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Only show idea-bank items
  const ideas = projectContents.filter(c => c.status === 'idea-bank');

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === ideas.length) setSelected(new Set());
    else setSelected(new Set(ideas.map(i => i.id)));
  };

  const moveToProduction = async () => {
    for (const id of selected) {
      await updateContentStatus(id, 'idea');
    }
    setSelected(new Set());
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
                style={{ backgroundColor: 'var(--client-500, hsl(var(--primary)))', color: 'var(--client-50, hsl(var(--primary-foreground)))' }}
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Adicionar ideia</span>
              </Button>
            }
          />
        }
      />
      <div className="p-6">
        {selected.size > 0 && (
          <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
            <span className="text-sm font-medium text-foreground">{selected.size} selecionada(s)</span>
            <button
              onClick={moveToProduction}
              className="ml-auto text-sm font-medium px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Mover para Rascunho
            </button>
          </div>
        )}

        {/* Table header */}
        <div className="border border-border rounded-xl overflow-hidden bg-card">
          <div className="grid grid-cols-[40px_40px_1fr_180px_180px] items-center px-4 py-2.5 border-b border-border bg-secondary/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <div className="flex items-center justify-center">
              <Checkbox
                checked={ideas.length > 0 && selected.size === ideas.length}
                onCheckedChange={toggleAll}
              />
            </div>
            <div></div>
            <div>Título do Conteúdo</div>
            <div>Formato</div>
            <div>Plataformas</div>
          </div>

          {ideas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <p className="text-sm">Nenhuma ideia cadastrada ainda.</p>
              <p className="text-xs mt-1">Crie conteúdos com status "Ideia" para vê-los aqui.</p>
            </div>
          ) : (
            ideas.map(idea => {
              const platforms = Array.isArray(idea.platform) ? idea.platform : [idea.platform];
              const PlatformIcon = platforms[0] ? platformIcons[platforms[0] as Platform] : null;

              return (
                <div
                  key={idea.id}
                  className={cn(
                    "grid grid-cols-[40px_40px_1fr_180px_180px] items-center px-4 py-3 border-b border-border last:border-b-0 hover:bg-secondary/30 transition-colors",
                    selected.has(idea.id) && "bg-primary/5"
                  )}
                >
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={selected.has(idea.id)}
                      onCheckedChange={() => toggleSelect(idea.id)}
                    />
                  </div>
                  <div className="flex items-center justify-center">
                    {PlatformIcon && (
                      <PlatformIcon size={16} className="text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-foreground truncate block">{idea.title}</span>
                    {idea.description && (
                      <span className="text-xs text-muted-foreground truncate block mt-0.5">{idea.description}</span>
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
                    {platforms.map(p => (
                      <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                        {PLATFORM_LABELS[p as Platform] || p}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};

export default IdeasBankPage;
