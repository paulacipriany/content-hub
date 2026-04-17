import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/contexts/AppContext';
import { useClientFromUrl } from '@/hooks/useClientFromUrl';
import ProjectNotes from '@/components/notes/ProjectNotes';

const NotesPage = () => {
  useClientFromUrl();
  const { selectedProject, loading } = useApp();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground animate-pulse">Carregando anotações...</p>
      </div>
    );
  }

  if (!selectedProject) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <h2 className="text-lg font-semibold text-foreground mb-2">Projeto não encontrado</h2>
        <p className="text-sm text-muted-foreground mb-6">Não foi possível carregar as anotações deste projeto.</p>
      </div>
    );
  }

  return (
    <>
      <TopBar title="Anotações" subtitle="Notas, listas e ideias do projeto" />
      <div className="p-6">
        <ProjectNotes projectId={selectedProject.id} />
      </div>
    </>
  );
};

export default NotesPage;
