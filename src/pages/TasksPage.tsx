import TopBar from '@/components/layout/TopBar';
import TaskListCard from '@/components/dashboard/TaskListCard';
import { useClientFromUrl } from '@/hooks/useClientFromUrl';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

const TasksPage = () => {
  useClientFromUrl();
  const { selectedProject } = useApp();

  if (!selectedProject) return null;

  const scrollToTaskInput = () => {
    const input = document.querySelector('input[placeholder="Nova tarefa..."]') as HTMLInputElement;
    if (input) {
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      input.focus();
    }
  };

  return (
    <>
      <TopBar
        title="Tarefas"
        subtitle="Gerencie as tarefas do projeto"
        actions={
          <Button
            size="sm"
            className="gap-1.5 h-9"
            onClick={scrollToTaskInput}
            style={{ backgroundColor: 'var(--client-500, hsl(var(--primary)))', color: '#ffffff' }}
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Criar tarefa</span>
          </Button>
        }
      />
      <div className="p-6">
        <TaskListCard projectId={selectedProject.id} />
      </div>
    </>
  );
};

export default TasksPage;
