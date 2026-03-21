import { useState, useRef } from 'react';
import { Plus } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import TaskListCard, { TaskListCardHandle } from '@/components/dashboard/TaskListCard';
import { useClientFromUrl } from '@/hooks/useClientFromUrl';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Filter, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type TaskStatus = 'backlog' | 'planning' | 'in_progress' | 'paused' | 'done' | 'cancelled' | 'group';
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent' | string;

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'planning', label: 'Planejamento' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'paused', label: 'Pausado' },
  { value: 'done', label: 'Concluído' },
  { value: 'cancelled', label: 'Cancelado' },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
];

const DATE_FILTER_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'overdue', label: 'Atrasadas' },
  { value: 'today', label: 'Hoje' },
  { value: 'this_week', label: 'Esta semana' },
  { value: 'no_date', label: 'Sem data' },
] as const;

type DateFilter = typeof DATE_FILTER_OPTIONS[number]['value'];

export interface TaskFilters {
  statuses: TaskStatus[];
  priorities: TaskPriority[];
  dateFilter: DateFilter;
}

const FilterChip = ({ label, onRemove }: { label: string; onRemove: () => void }) => (
  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
    {label}
    <button onClick={onRemove} className="hover:text-destructive transition-colors"><X size={12} /></button>
  </span>
);

const TasksPage = () => {
  useClientFromUrl();
  const { selectedProject, loading } = useApp();
  const [filters, setFilters] = useState<TaskFilters>({ statuses: [], priorities: [], dateFilter: 'all' });

  const taskListRef = useRef<TaskListCardHandle>(null);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground animate-pulse">Carregando tarefas...</p>
      </div>
    );
  }

  if (!selectedProject) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <h2 className="text-lg font-semibold text-foreground mb-2">Projeto não encontrado</h2>
        <p className="text-sm text-muted-foreground mb-6">Não foi possível carregar as tarefas deste projeto.</p>
      </div>
    );
  }

  const hasActiveFilters = filters.statuses.length > 0 || filters.priorities.length > 0 || filters.dateFilter !== 'all';
  const activeCount = filters.statuses.length + filters.priorities.length + (filters.dateFilter !== 'all' ? 1 : 0);

  const toggleStatus = (s: TaskStatus) => setFilters(prev => ({ ...prev, statuses: prev.statuses.includes(s) ? prev.statuses.filter(x => x !== s) : [...prev.statuses, s] }));
  const togglePriority = (p: TaskPriority) => setFilters(prev => ({ ...prev, priorities: prev.priorities.includes(p) ? prev.priorities.filter(x => x !== p) : [...prev.priorities, p] }));
  const clearFilters = () => setFilters({ statuses: [], priorities: [], dateFilter: 'all' });

  const projectColor = selectedProject?.color || '#1369db';

  return (
    <>
      <TopBar title="Tarefas" subtitle="Gerencie as tarefas do projeto" className="bg-[#c5daf7] border-[#c5daf7]" />
      <div className="bg-[#c5daf7] min-h-screen">
        {/* Color accent bar */}
        <div className="h-2 w-full" style={{ background: `linear-gradient(90deg, ${projectColor}, ${projectColor}cc)` }} />
        {/* Filter bar */}
        <div className="flex items-center gap-2 px-6 py-4 flex-wrap">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("gap-1.5 h-8 text-xs", filters.statuses.length > 0 && "border-primary/50 bg-primary/5")}>
                <Filter size={12} /> Status
                {filters.statuses.length > 0 && <span className="bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px]">{filters.statuses.length}</span>}
                <ChevronDown size={12} className="opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-44 p-1" align="start">
              {STATUS_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => toggleStatus(opt.value)}
                  className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors hover:bg-secondary", filters.statuses.includes(opt.value) && "bg-secondary")}>
                  <div className={cn("w-3.5 h-3.5 rounded border flex items-center justify-center", filters.statuses.includes(opt.value) ? "bg-primary border-primary" : "border-border")}>
                    {filters.statuses.includes(opt.value) && <span className="text-primary-foreground text-[8px]">✓</span>}
                  </div>
                  {opt.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("gap-1.5 h-8 text-xs", filters.priorities.length > 0 && "border-primary/50 bg-primary/5")}>
                <Filter size={12} /> Prioridade
                {filters.priorities.length > 0 && <span className="bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px]">{filters.priorities.length}</span>}
                <ChevronDown size={12} className="opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-36 p-1" align="start">
              {PRIORITY_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => togglePriority(opt.value)}
                  className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors hover:bg-secondary", filters.priorities.includes(opt.value) && "bg-secondary")}>
                  <div className={cn("w-3.5 h-3.5 rounded border flex items-center justify-center", filters.priorities.includes(opt.value) ? "bg-primary border-primary" : "border-border")}>
                    {filters.priorities.includes(opt.value) && <span className="text-primary-foreground text-[8px]">✓</span>}
                  </div>
                  {opt.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("gap-1.5 h-8 text-xs", filters.dateFilter !== 'all' && "border-primary/50 bg-primary/5")}>
                <Filter size={12} /> Data
                {filters.dateFilter !== 'all' && <span className="bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px]">1</span>}
                <ChevronDown size={12} className="opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-1" align="start">
              {DATE_FILTER_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setFilters(prev => ({ ...prev, dateFilter: opt.value }))}
                  className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors hover:bg-secondary", filters.dateFilter === opt.value && "bg-secondary font-medium")}>
                  {opt.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {hasActiveFilters && (
            <>
              <div className="h-4 w-px bg-border mx-1" />
              {filters.statuses.map(s => <FilterChip key={s} label={STATUS_OPTIONS.find(o => o.value === s)!.label} onRemove={() => toggleStatus(s)} />)}
              {filters.priorities.map(p => <FilterChip key={p} label={PRIORITY_OPTIONS.find(o => o.value === p)!.label} onRemove={() => togglePriority(p)} />)}
              {filters.dateFilter !== 'all' && <FilterChip label={DATE_FILTER_OPTIONS.find(o => o.value === filters.dateFilter)!.label} onRemove={() => setFilters(prev => ({ ...prev, dateFilter: 'all' }))} />}
              <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-1">Limpar ({activeCount})</button>
            </>
          )}

          <Button size="sm" onClick={() => taskListRef.current?.triggerNewList()} className="ml-auto gap-1.5 h-8 text-xs bg-[#1369db] text-white hover:bg-[#1369db]/90">
            <Plus size={14} /> Nova lista
          </Button>
        </div>

        <div className="px-6">
          <TaskListCard ref={taskListRef} projectId={selectedProject.id} filters={filters} showNewListInline={false} />
        </div>
      </div>
    </>
  );
};

export default TasksPage;
