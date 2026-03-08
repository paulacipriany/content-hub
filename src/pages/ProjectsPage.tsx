import TopBar from '@/components/layout/TopBar';
import { mockProjects } from '@/data/mockData';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { FolderOpen } from 'lucide-react';

const ProjectsPage = () => {
  const { contents } = useApp();
  const navigate = useNavigate();

  return (
    <>
      <TopBar title="Projetos" subtitle="Gerencie seus projetos e campanhas" />
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockProjects.map(project => {
            const projectContents = contents.filter(c => c.projectId === project.id);
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
                {/* Progress bar */}
                <div className="mt-3 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-status-published transition-all"
                    style={{ width: `${projectContents.length > 0 ? (published / projectContents.length) * 100 : 0}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default ProjectsPage;
