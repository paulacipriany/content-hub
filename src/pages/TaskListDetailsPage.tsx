import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import TaskListCard from '@/components/dashboard/TaskListCard';
import { useClientFromUrl } from '@/hooks/useClientFromUrl';
import { useApp } from '@/contexts/AppContext';

const TaskListDetailsPage = () => {
  const { id: projectId, listId } = useParams();
  const navigate = useNavigate();
  useClientFromUrl(); // ensures the client context is set based on the URL ID
  const { selectedProject } = useApp();

  if (!selectedProject || !listId || !projectId) return null;

  return (
    <>
      <TopBar 
        title="Detalhes da Lista" 
        subtitle="Veja e gerencie as tarefas desta lista específica"
      />
      <div className="p-6" style={{ '--primary': '318 100% 77%', '--ring': '318 100% 77%' } as any}>
        <button 
          onClick={() => navigate(`/clients/${projectId}/tasks`)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-6 group"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          Voltar para todas as listas
        </button>

        <div className="bg-card rounded-3xl border shadow-sm p-4 md:p-8">
          <TaskListCard 
            projectId={projectId} 
            singleListId={listId}
            showNewListInline={false}
          />
        </div>
      </div>
    </>
  );
};

export default TaskListDetailsPage;
