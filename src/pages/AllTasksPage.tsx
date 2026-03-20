import { useState, useEffect, useCallback, useMemo } from 'react';
import TopBar from '@/components/layout/TopBar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Filter, ChevronDown, X, Calendar as CalendarIcon, User } from 'lucide-react';
import { cn, withTimeout } from '@/lib/utils';
import { format, isPast, isToday, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type TaskStatus = 'backlog' | 'planning' | 'in_progress' | 'paused' | 'done' | 'cancelled';
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

interface AllTask {
  id: string;
  text: string;
  done: boolean;
  due_date: string | null;
  assigned_to: string | null;
  status: TaskStatus | null;
  priority: TaskPriority | null;
  project_id: string;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'backlog', label: 'Backlog', color: 'bg-muted text-muted-foreground' },
  { value: 'planning', label: 'Planejamento', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  { value: 'in_progress', label: 'Em andamento', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  { value: 'paused', label: 'Pausado', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  { value: 'done', label: 'Concluído', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  { value: 'cancelled', label: 'Cancelado', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Baixa', color: 'text-muted-foreground' },
  { value: 'medium', label: 'Média', color: 'text-blue-600' },
  { value: 'high', label: 'Alta', color: 'text-amber-600' },
  { value: 'urgent', label: 'Urgente', color: 'text-red-600' },
];

const DATE_FILTER_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'overdue', label: 'Atrasadas' },
  { value: 'today', label: 'Hoje' },
  { value: 'this_week', label: 'Esta semana' },
  { value: 'no_date', label: 'Sem data' },
] as const;

type DateFilter = typeof DATE_FILTER_OPTIONS[number]['value'];

interface Filters {
  statuses: TaskStatus[];
  priorities: TaskPriority[];
  dateFilter: DateFilter;
  projectIds: string[];
}

const FilterChip = ({ label, onRemove }: { label: string; onRemove: () => void }) => (
  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
    {label}
    <button onClick={onRemove} className="hover:text-destructive transition-colors"><X size={12} /></button>
  </span>
);

const AllTasksPage = () => {
  const { role } = useAuth();
  const { projects, setSelectedProject } = useApp();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<AllTask[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { display_name: string | null; avatar_url: string | null }>>({});
  const [filters, setFilters] = useState<Filters>({ statuses: [], priorities: [], dateFilter: 'all', projectIds: [] });
  const [loading, setLoading] = useState(true);

  const projectMap = useMemo(() => {
    const m: Record<string, { name: string; color: string }> = {};
    projects.forEach(p => { m[p.id] = { name: p.name, color: p.color }; });
    return m;
  }, [projects]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await withTimeout(supabase
        .from('project_tasks')
        .select('id, text, done, due_date, assigned_to, status, priority, project_id')
        .order('due_date', { ascending: true, nullsFirst: false }), 
        15000
      );
      setTasks((data as AllTask[]) ?? []);

      // Fetch profiles for assigned users
      const userIds = [...new Set(((data as any[]) ?? []).map((t: any) => t.assigned_to).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profs } = await withTimeout(supabase.from('profiles').select('user_id, display_name, avatar_url').in('user_id', userIds));
        const map: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
        (profs ?? []).forEach((p: any) => { map[p.user_id] = { display_name: p.display_name, avatar_url: p.avatar_url }; });
        setProfiles(map);
      }
    } catch (err: any) {
      console.error('Error fetching tasks:', err);
      const { toast } = await import('sonner');
      toast.error('Erro ao carregar tarefas: ' + (err.message || 'Tempo limite excedido'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const filtered = useMemo(() => {
    let result = tasks;
    if (filters.statuses.length > 0) {
      result = result.filter(t => filters.statuses.includes(t.status as TaskStatus));
    }
    if (filters.priorities.length > 0) {
      result = result.filter(t => filters.priorities.includes(t.priority as TaskPriority));
    }
    if (filters.projectIds.length > 0) {
      result = result.filter(t => filters.projectIds.includes(t.project_id));
    }
    if (filters.dateFilter !== 'all') {
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      result = result.filter(t => {
        if (filters.dateFilter === 'no_date') return !t.due_date;
        if (!t.due_date) return false;
        const d = new Date(t.due_date + 'T12:00:00');
        if (filters.dateFilter === 'overdue') return isPast(d) && !isToday(d) && !t.done;
        if (filters.dateFilter === 'today') return isToday(d);
        if (filters.dateFilter === 'this_week') return d >= weekStart && d <= weekEnd;
        return true;
      });
    }
    return result;
  }, [tasks, filters]);

  // Only admin/moderator can access
  if (role !== 'admin' && role !== 'moderator') return null;

  const hasActiveFilters = filters.statuses.length > 0 || filters.priorities.length > 0 || filters.dateFilter !== 'all' || filters.projectIds.length > 0;
  const activeCount = filters.statuses.length + filters.priorities.length + (filters.dateFilter !== 'all' ? 1 : 0) + filters.projectIds.length;

  const toggleStatus = (s: TaskStatus) => setFilters(prev => ({ ...prev, statuses: prev.statuses.includes(s) ? prev.statuses.filter(x => x !== s) : [...prev.statuses, s] }));
  const togglePriority = (p: TaskPriority) => setFilters(prev => ({ ...prev, priorities: prev.priorities.includes(p) ? prev.priorities.filter(x => x !== p) : [...prev.priorities, p] }));
  const toggleProject = (id: string) => setFilters(prev => ({ ...prev, projectIds: prev.projectIds.includes(id) ? prev.projectIds.filter(x => x !== id) : [...prev.projectIds, id] }));
  const clearFilters = () => setFilters({ statuses: [], priorities: [], dateFilter: 'all', projectIds: [] });

  const getStatusOpt = (s: string | null) => STATUS_OPTIONS.find(o => o.value === s);
  const getPriorityOpt = (p: string | null) => PRIORITY_OPTIONS.find(o => o.value === p);

  return (
    <>
      <TopBar title="Tarefas Gerais" subtitle="Todas as tarefas de todos os clientes" />
      <div className="p-6 bg-[#c5daf7] min-h-screen">
        {/* Filter bar */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {/* Status filter */}
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
                <button key={opt.value} onClick={() => toggleStatus(opt.value)} className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors hover:bg-secondary", filters.statuses.includes(opt.value) && "bg-secondary")}>
                  <div className={cn("w-3.5 h-3.5 rounded border flex items-center justify-center", filters.statuses.includes(opt.value) ? "bg-primary border-primary" : "border-border")}>
                    {filters.statuses.includes(opt.value) && <span className="text-primary-foreground text-[8px]">✓</span>}
                  </div>
                  {opt.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {/* Priority filter */}
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
                <button key={opt.value} onClick={() => togglePriority(opt.value)} className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors hover:bg-secondary", filters.priorities.includes(opt.value) && "bg-secondary")}>
                  <div className={cn("w-3.5 h-3.5 rounded border flex items-center justify-center", filters.priorities.includes(opt.value) ? "bg-primary border-primary" : "border-border")}>
                    {filters.priorities.includes(opt.value) && <span className="text-primary-foreground text-[8px]">✓</span>}
                  </div>
                  {opt.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {/* Date filter */}
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
                <button key={opt.value} onClick={() => setFilters(prev => ({ ...prev, dateFilter: opt.value }))} className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors hover:bg-secondary", filters.dateFilter === opt.value && "bg-secondary font-medium")}>
                  {opt.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {/* Client filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("gap-1.5 h-8 text-xs", filters.projectIds.length > 0 && "border-primary/50 bg-primary/5")}>
                <Filter size={12} /> Cliente
                {filters.projectIds.length > 0 && <span className="bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px]">{filters.projectIds.length}</span>}
                <ChevronDown size={12} className="opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-1" align="start">
              {projects.map(p => (
                <button key={p.id} onClick={() => toggleProject(p.id)} className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors hover:bg-secondary", filters.projectIds.includes(p.id) && "bg-secondary")}>
                  <div className={cn("w-3.5 h-3.5 rounded border flex items-center justify-center", filters.projectIds.includes(p.id) ? "bg-primary border-primary" : "border-border")}>
                    {filters.projectIds.includes(p.id) && <span className="text-primary-foreground text-[8px]">✓</span>}
                  </div>
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                  <span className="truncate">{p.name}</span>
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {/* Active chips */}
          {hasActiveFilters && (
            <>
              <div className="h-4 w-px bg-border mx-1" />
              {filters.statuses.map(s => <FilterChip key={s} label={STATUS_OPTIONS.find(o => o.value === s)!.label} onRemove={() => toggleStatus(s)} />)}
              {filters.priorities.map(p => <FilterChip key={p} label={PRIORITY_OPTIONS.find(o => o.value === p)!.label} onRemove={() => togglePriority(p)} />)}
              {filters.projectIds.map(id => <FilterChip key={id} label={projectMap[id]?.name ?? id} onRemove={() => toggleProject(id)} />)}
              {filters.dateFilter !== 'all' && <FilterChip label={DATE_FILTER_OPTIONS.find(o => o.value === filters.dateFilter)!.label} onRemove={() => setFilters(prev => ({ ...prev, dateFilter: 'all' }))} />}
              <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-1">Limpar ({activeCount})</button>
            </>
          )}
        </div>

        {/* Task table */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Carregando tarefas...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Nenhuma tarefa encontrada.</div>
        ) : (
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-2.5 font-medium">Cliente</th>
                  <th className="text-left px-4 py-2.5 font-medium">Tarefa</th>
                  <th className="text-left px-4 py-2.5 font-medium w-32">Status</th>
                  <th className="text-left px-4 py-2.5 font-medium w-28">Prioridade</th>
                  <th className="text-left px-4 py-2.5 font-medium w-28">Data</th>
                  <th className="text-left px-4 py-2.5 font-medium w-36">Responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(task => {
                  const project = projectMap[task.project_id];
                  const statusOpt = getStatusOpt(task.status);
                  const priorityOpt = getPriorityOpt(task.priority);
                  const assignee = task.assigned_to ? profiles[task.assigned_to] : null;
                  const isOverdue = task.due_date && !task.done && isPast(new Date(task.due_date + 'T23:59:59')) && !isToday(new Date(task.due_date + 'T12:00:00'));

                  return (
                    <tr
                      key={task.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => {
                        if (project) {
                          const p = projects.find(pr => pr.id === task.project_id);
                          if (p) {
                            setSelectedProject(p);
                            navigate(`/clients/${task.project_id}/tasks`);
                          }
                        }
                      }}
                    >
                      <td className="px-4 py-2.5">
                        {project ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold" style={{ backgroundColor: project.color + '22', color: project.color }}>
                            {project.name}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cn("text-sm", task.done && "line-through text-muted-foreground")}>{task.text}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        {statusOpt && (
                          <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium", statusOpt.color)}>
                            {statusOpt.label}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {priorityOpt && (
                          <span className={cn("text-xs font-medium", priorityOpt.color)}>
                            {priorityOpt.label}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {task.due_date ? (
                          <span className={cn("text-xs", isOverdue ? "text-destructive font-medium" : "text-muted-foreground")}>
                            {format(new Date(task.due_date + 'T12:00:00'), 'dd/MM/yyyy')}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {assignee ? (
                          <div className="flex items-center gap-1.5">
                            {assignee.avatar_url ? (
                              <img src={assignee.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                                <User size={10} className="text-primary" />
                              </div>
                            )}
                            <span className="text-xs text-muted-foreground truncate max-w-[100px]">{assignee.display_name ?? '—'}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

export default AllTasksPage;
