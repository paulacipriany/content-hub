import TopBar from '@/components/layout/TopBar';
import TaskListCard from '@/components/dashboard/TaskListCard';
import { useClientFromUrl } from '@/hooks/useClientFromUrl';
import { useApp } from '@/contexts/AppContext';

const TasksPage = () => {
  useClientFromUrl();
  const { selectedProject } = useApp();

  if (!selectedProject) return null;

  return (
    <>
      <TopBar title="Tarefas" subtitle="Gerencie as tarefas do projeto" />
      <div className="p-6 max-w-3xl">
        <TaskListCard projectId={selectedProject.id} />
      </div>
    </>
  );
};

export default TasksPage;
