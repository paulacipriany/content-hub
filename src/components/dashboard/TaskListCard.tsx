import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Trash2, CalendarIcon, X, UserPlus, User, ChevronDown, ChevronRight, MoreHorizontal, Pencil, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isPast, isToday, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { isToday as isTodayFn, isPast as isPastFn } from 'date-fns';
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Task {
  id: string;
  text: string;
  done: boolean;
  sort_order: number;
  due_date: string | null;
  assigned_to: string | null;
  created_by: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  list_id?: string | null;
}

interface TaskList {
  id: string;
  title: string;
  sort_order: number;
  project_id: string;
  created_by: string;
}

interface MemberProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface TaskFilters {
  statuses: TaskStatus[];
  priorities: TaskPriority[];
  dateFilter: 'all' | 'overdue' | 'today' | 'this_week' | 'no_date';
}

interface TaskListCardProps {
  projectId: string;
  hideDone?: boolean;
  filters?: TaskFilters;
}

type TaskStatus = 'backlog' | 'planning' | 'in_progress' | 'paused' | 'done' | 'cancelled';
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string; group: string }[] = [
  { value: 'backlog', label: 'Backlog', color: 'bg-muted text-muted-foreground', group: 'A fazer' },
  { value: 'planning', label: 'Planejamento', color: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400', group: 'Em andamento' },
  { value: 'in_progress', label: 'Em andamento', color: 'bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400', group: 'Em andamento' },
  { value: 'paused', label: 'Pausado', color: 'bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400', group: 'Em andamento' },
  { value: 'done', label: 'Concluído', color: 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400', group: 'Completo' },
  { value: 'cancelled', label: 'Cancelado', color: 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400', group: 'Completo' },
];

const STATUS_GROUPS = [
  { key: 'A fazer', label: 'A fazer' },
  { key: 'Em andamento', label: 'Em andamento' },
  { key: 'Completo', label: 'Completo' },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Baixa', color: 'bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-400' },
  { value: 'medium', label: 'Média', color: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400' },
  { value: 'high', label: 'Alta', color: 'bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400' },
  { value: 'urgent', label: 'Urgente', color: 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400' },
];

const getTaskStatus = (done: boolean, status?: TaskStatus): TaskStatus => {
  if (status) return status;
  return done ? 'done' : 'backlog';
};

// ─── Inline editable text ────────────────────────────────────────
const EditableText = ({ text, className, onSave }: { text: string; className?: string; onSave: (text: string) => void }) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setValue(text); }, [text]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => {
    setEditing(false);
    if (value.trim() && value.trim() !== text) onSave(value.trim());
    else setValue(text);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setValue(text); setEditing(false); } }}
        className={cn("bg-transparent border-b border-primary/40 outline-none w-full", className)}
      />
    );
  }

  return (
    <span onDoubleClick={() => setEditing(true)} className={cn("cursor-text", className)} title="Clique duplo para editar">
      {text}
    </span>
  );
};

// ─── Status badge with popover ───────────────────────────────────
const StatusBadge = ({ status, onChange }: { status: TaskStatus; onChange: (status: TaskStatus) => void }) => {
  const [open, setOpen] = useState(false);
  const currentOption = STATUS_OPTIONS.find(s => s.value === status) ?? STATUS_OPTIONS[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors", currentOption.color)}>
          {currentOption.label}
          <ChevronDown size={10} className="opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-1" align="start">
        {STATUS_GROUPS.map(group => (
          <div key={group.key}>
            <div className="px-2 py-1 text-xs font-medium text-muted-foreground">{group.label}</div>
            {STATUS_OPTIONS.filter(opt => opt.group === group.key).map(opt => (
              <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); }}
                className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors hover:bg-secondary", status === opt.value && "bg-secondary")}>
                <span className={cn("w-2 h-2 rounded-full",
                  opt.value === 'backlog' ? 'bg-muted-foreground' : opt.value === 'planning' ? 'bg-blue-500' :
                  opt.value === 'in_progress' ? 'bg-orange-500' : opt.value === 'paused' ? 'bg-purple-500' :
                  opt.value === 'done' ? 'bg-green-500' : 'bg-red-500'
                )} />
                {opt.label}
              </button>
            ))}
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
};

// ─── Priority badge ──────────────────────────────────────────────
const PriorityBadge = ({ priority, onChange }: { priority: TaskPriority; onChange: (priority: TaskPriority) => void }) => {
  const [open, setOpen] = useState(false);
  const currentOption = PRIORITY_OPTIONS.find(p => p.value === priority) ?? PRIORITY_OPTIONS[1];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors", currentOption.color)}>
          {currentOption.label}
          <ChevronDown size={10} className="opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-32 p-1" align="start">
        <div className="px-2 py-1 text-xs font-medium text-muted-foreground">Prioridade</div>
        {PRIORITY_OPTIONS.map(opt => (
          <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); }}
            className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors hover:bg-secondary", priority === opt.value && "bg-secondary")}>
            <span className={cn("w-2 h-2 rounded-full",
              opt.value === 'low' ? 'bg-slate-500' : opt.value === 'medium' ? 'bg-yellow-500' :
              opt.value === 'high' ? 'bg-orange-500' : 'bg-red-500'
            )} />
            {opt.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
};

// ─── Main component ──────────────────────────────────────────────
const TaskListCard = ({ projectId, hideDone = false, filters }: TaskListCardProps) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [lists, setLists] = useState<TaskList[]>([]);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteListId, setDeleteListId] = useState<string | null>(null);
  const [deleteListDialogOpen, setDeleteListDialogOpen] = useState(false);
  const [collapsedLists, setCollapsedLists] = useState<Set<string>>(new Set());
  const [creatingListName, setCreatingListName] = useState('');
  const [showNewListInput, setShowNewListInput] = useState(false);
  const [addingToList, setAddingToList] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState('');
  const newListInputRef = useRef<HTMLInputElement>(null);
  const newTaskInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchAll(); }, [projectId, user]);
  useEffect(() => { if (showNewListInput) newListInputRef.current?.focus(); }, [showNewListInput]);
  useEffect(() => { if (addingToList) newTaskInputRef.current?.focus(); }, [addingToList]);

  const fetchAll = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: tasksData }, { data: listsData }, { data: memberRows }, { data: project }] = await Promise.all([
      supabase.from('project_tasks').select('id, text, done, sort_order, due_date, assigned_to, created_by, status, priority, list_id').eq('project_id', projectId).order('sort_order').order('created_at'),
      supabase.from('task_lists').select('id, title, sort_order, project_id, created_by').eq('project_id', projectId).order('sort_order'),
      supabase.from('project_members').select('user_id').eq('project_id', projectId),
      supabase.from('projects').select('owner_id').eq('id', projectId).single(),
    ]);
    setTasks((tasksData as Task[]) ?? []);
    setLists((listsData as TaskList[]) ?? []);

    const userIds = new Set<string>();
    (memberRows ?? []).forEach(m => userIds.add(m.user_id));
    if (project?.owner_id) userIds.add(project.owner_id);
    if (userIds.size > 0) {
      const { data: profiles } = await supabase.from('profiles').select('user_id, display_name, avatar_url').in('user_id', Array.from(userIds));
      setMembers((profiles as MemberProfile[]) ?? []);
    }
    setLoading(false);
  };

  // ─── CRUD operations ────────────────────────────────────────────
  const createList = async () => {
    const title = creatingListName.trim();
    if (!title || !user) return;
    const nextOrder = lists.length > 0 ? Math.max(...lists.map(l => l.sort_order)) + 1 : 0;
    const { data } = await supabase.from('task_lists').insert({ project_id: projectId, title, sort_order: nextOrder, created_by: user.id } as any).select().single();
    if (data) setLists(prev => [...prev, data as TaskList]);
    setCreatingListName('');
    setShowNewListInput(false);
  };

  const updateListTitle = async (listId: string, title: string) => {
    setLists(prev => prev.map(l => l.id === listId ? { ...l, title } : l));
    await supabase.from('task_lists').update({ title } as any).eq('id', listId);
  };

  const deleteList = async (listId: string) => {
    setLists(prev => prev.filter(l => l.id !== listId));
    setTasks(prev => prev.filter(t => t.list_id !== listId));
    await supabase.from('task_lists').delete().eq('id', listId);
  };

  const addTask = async (listId: string) => {
    const trimmed = newTaskText.trim();
    if (!trimmed || !user) return;
    const listTasks = tasks.filter(t => t.list_id === listId);
    const nextOrder = listTasks.length > 0 ? Math.max(...listTasks.map(t => t.sort_order)) + 1 : 0;
    const { data } = await supabase.from('project_tasks').insert({
      project_id: projectId, text: trimmed, created_by: user.id, sort_order: nextOrder, list_id: listId,
    } as any).select('id, text, done, sort_order, due_date, assigned_to, created_by, status, priority, list_id').single();
    if (data) setTasks(prev => [...prev, data as Task]);
    setNewTaskText('');
  };

  const toggleDone = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newDone = !task.done;
    const newStatus = newDone ? 'done' : 'backlog';
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: newDone, status: newStatus as TaskStatus } : t));
    await supabase.from('project_tasks').update({ done: newDone, status: newStatus }).eq('id', id);
  };

  const updateTaskStatus = async (id: string, status: TaskStatus) => {
    const done = status === 'done';
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status, done } : t));
    await supabase.from('project_tasks').update({ status, done }).eq('id', id);
  };

  const updatePriority = async (id: string, priority: TaskPriority) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, priority } : t));
    await supabase.from('project_tasks').update({ priority }).eq('id', id);
  };

  const updateDueDate = async (id: string, date: Date | undefined) => {
    const due_date = date ? format(date, 'yyyy-MM-dd') : null;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, due_date } : t));
    await supabase.from('project_tasks').update({ due_date } as any).eq('id', id);
  };

  const updateAssignee = async (id: string, assigned_to: string | null) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, assigned_to } : t));
    await supabase.from('project_tasks').update({ assigned_to } as any).eq('id', id);
  };

  const updateTaskText = async (id: string, text: string) => {
    if (!text.trim()) return;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, text: text.trim() } : t));
    await supabase.from('project_tasks').update({ text: text.trim() }).eq('id', id);
  };

  const deleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    await supabase.from('project_tasks').delete().eq('id', id);
  };

  // ─── Helpers ─────────────────────────────────────────────────────
  const getMemberName = (userId: string | null) => {
    if (!userId) return null;
    const m = members.find(p => p.user_id === userId);
    return m?.display_name || 'Usuário';
  };

  const getMemberInitials = (userId: string | null) => {
    const name = getMemberName(userId);
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getDueDateStyle = (due_date: string | null, done: boolean) => {
    if (!due_date || done) return 'text-muted-foreground';
    const date = new Date(due_date + 'T00:00:00');
    if (isToday(date)) return 'text-amber-500';
    if (isPast(date)) return 'text-destructive';
    return 'text-muted-foreground';
  };

  const toggleCollapsed = (listId: string) => {
    setCollapsedLists(prev => {
      const next = new Set(prev);
      next.has(listId) ? next.delete(listId) : next.add(listId);
      return next;
    });
  };

  // ─── Filter tasks ────────────────────────────────────────────────
  const filterTask = useCallback((t: Task) => {
    if (hideDone && t.done) return false;
    if (!filters) return true;
    if (filters.statuses.length > 0 && !filters.statuses.includes(getTaskStatus(t.done, t.status))) return false;
    if (filters.priorities.length > 0 && !filters.priorities.includes(t.priority as TaskPriority || 'medium')) return false;
    if (filters.dateFilter !== 'all') {
      const now = new Date();
      switch (filters.dateFilter) {
        case 'no_date': return !t.due_date;
        case 'today': return t.due_date ? isTodayFn(new Date(t.due_date + 'T00:00:00')) : false;
        case 'overdue': return t.due_date ? isPastFn(new Date(t.due_date + 'T00:00:00')) && !isTodayFn(new Date(t.due_date + 'T00:00:00')) && !t.done : false;
        case 'this_week': {
          if (!t.due_date) return false;
          const d = new Date(t.due_date + 'T00:00:00');
          return d >= startOfWeek(now, { weekStartsOn: 1 }) && d <= endOfWeek(now, { weekStartsOn: 1 });
        }
      }
    }
    return true;
  }, [hideDone, filters]);

  // ─── Assignee selector ──────────────────────────────────────────
  const AssigneeSelector = ({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) => (
    <Popover>
      <PopoverTrigger asChild>
        {value ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-primary-foreground text-[9px]"
                style={{ backgroundColor: 'var(--client-500, hsl(var(--primary)))' }}>
                {getMemberInitials(value)}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">{getMemberName(value)}</TooltipContent>
          </Tooltip>
        ) : (
          <button className="flex-shrink-0 text-muted-foreground opacity-0 group-hover/task:opacity-60 hover:!opacity-100 transition-all" title="Atribuir responsável">
            <UserPlus size={13} />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="end">
        <div className="text-xs font-medium text-muted-foreground px-2 py-1.5">Responsável</div>
        {value && (
          <button onClick={() => onChange(null)} className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-secondary/80 text-muted-foreground">
            <X size={14} /><span>Remover</span>
          </button>
        )}
        {members.map(m => (
          <button key={m.user_id} onClick={() => onChange(m.user_id)}
            className={cn("w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-secondary/80 transition-colors", value === m.user_id && "bg-secondary")}>
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-primary-foreground flex-shrink-0"
              style={{ backgroundColor: 'var(--client-500, hsl(var(--primary)))' }}>
              {(m.display_name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <span className="truncate">{m.display_name || 'Usuário'}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );

  // ─── Single task row (Basecamp style) ───────────────────────────
  const TaskRow = ({ task }: { task: Task }) => {
    const isOverdue = task.due_date && !task.done && isPast(new Date(task.due_date + 'T23:59:59')) && !isToday(new Date(task.due_date + 'T12:00:00'));

    return (
      <div className={cn(
        "group/task flex items-center gap-3 px-4 py-2.5 border-b border-border/50 last:border-b-0 transition-colors hover:bg-secondary/30",
        task.done && "opacity-60"
      )}>
        {/* Checkbox */}
        <button onClick={() => toggleDone(task.id)} className="flex-shrink-0">
          <div className={cn(
            "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
            task.done
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-border hover:border-primary/50"
          )}>
            {task.done && <span className="text-[10px] font-bold">✓</span>}
          </div>
        </button>

        {/* Task text */}
        <div className="flex-1 min-w-0">
          <EditableText
            text={task.text}
            className={cn("text-sm", task.done && "line-through text-muted-foreground")}
            onSave={(text) => updateTaskText(task.id, text)}
          />
        </div>

        {/* Status & Priority badges */}
        <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover/task:opacity-100 transition-opacity">
          <StatusBadge status={getTaskStatus(task.done, task.status)} onChange={(s) => updateTaskStatus(task.id, s)} />
          <PriorityBadge priority={(task.priority as TaskPriority) || 'medium'} onChange={(p) => updatePriority(task.id, p)} />
        </div>

        {/* Due date */}
        {task.due_date && (
          <span className={cn("text-xs flex-shrink-0 font-medium", getDueDateStyle(task.due_date, task.done))}>
            {format(new Date(task.due_date + 'T00:00:00'), "dd MMM", { locale: ptBR })}
          </span>
        )}

        {/* Assignee */}
        <AssigneeSelector value={task.assigned_to} onChange={(v) => updateAssignee(task.id, v)} />

        {/* Date picker */}
        <Popover>
          <PopoverTrigger asChild>
            <button className={cn("flex-shrink-0 transition-all",
              task.due_date ? cn("opacity-60 hover:opacity-100", getDueDateStyle(task.due_date, task.done))
                : "opacity-0 group-hover/task:opacity-60 hover:!opacity-100 text-muted-foreground"
            )} title="Definir data">
              <CalendarIcon size={13} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar mode="single" selected={task.due_date ? new Date(task.due_date + 'T00:00:00') : undefined}
              onSelect={(date) => updateDueDate(task.id, date)} initialFocus className="p-3 pointer-events-auto" />
            {task.due_date && (
              <div className="px-3 pb-3">
                <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={() => updateDueDate(task.id, undefined)}>
                  <X size={12} className="mr-1" /> Remover data
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Delete */}
        <button onClick={() => { setDeleteTaskId(task.id); setDeleteDialogOpen(true); }}
          className="opacity-0 group-hover/task:opacity-100 text-muted-foreground hover:text-destructive transition-all flex-shrink-0">
          <Trash2 size={13} />
        </button>
      </div>
    );
  };

  // ─── Sortable task row wrapper ──────────────────────────────────
  const SortableTaskRow = ({ task }: { task: Task }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: task.id,
      data: { type: 'task', task },
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.4 : 1,
    };

    return (
      <div ref={setNodeRef} style={style} className="relative group/sortable">
        <div {...attributes} {...listeners}
          className="absolute left-0 top-0 bottom-0 w-6 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover/sortable:opacity-60 transition-opacity z-10">
          <GripVertical size={14} className="text-muted-foreground" />
        </div>
        <div className="pl-2">
          <TaskRow task={task} />
        </div>
      </div>
    );
  };

  // ─── DnD setup ──────────────────────────────────────────────────
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const findListIdForTask = (taskId: string): string | null => {
    const task = tasks.find(t => t.id === taskId);
    return task?.list_id ?? null;
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if over is a list container (droppable id starts with 'list-')
    const overListId = overId.startsWith('list-') ? overId.replace('list-', '') : findListIdForTask(overId);
    const activeListId = findListIdForTask(activeId);

    if (overListId !== activeListId) {
      setTasks(prev => prev.map(t => t.id === activeId ? { ...t, list_id: overListId } : t));
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const targetListId = overId.startsWith('list-') ? overId.replace('list-', '') : findListIdForTask(overId);
    const task = tasks.find(t => t.id === activeId);
    if (!task) return;

    // Get tasks in the target list
    const listTasks = tasks.filter(t => t.list_id === targetListId && t.id !== activeId);

    // Find the position of the over item
    let newOrder: number;
    if (overId.startsWith('list-')) {
      // Dropped on the list container itself (empty area) - put at end
      newOrder = listTasks.length > 0 ? Math.max(...listTasks.map(t => t.sort_order)) + 1 : 0;
    } else {
      const overIndex = listTasks.findIndex(t => t.id === overId);
      if (overIndex >= 0) {
        newOrder = listTasks[overIndex].sort_order;
        // Shift subsequent tasks
        const tasksToShift = listTasks.filter(t => t.sort_order >= newOrder);
        for (const t of tasksToShift) {
          await supabase.from('project_tasks').update({ sort_order: t.sort_order + 1 }).eq('id', t.id);
        }
      } else {
        newOrder = listTasks.length;
      }
    }

    // Update the dragged task
    setTasks(prev => prev.map(t => t.id === activeId ? { ...t, list_id: targetListId, sort_order: newOrder } : t));
    await supabase.from('project_tasks').update({ list_id: targetListId, sort_order: newOrder } as any).eq('id', activeId);
  };

  // ─── Render a single list ───────────────────────────────────────
  const renderList = (list: TaskList) => {
    const allListTasks = tasks.filter(t => t.list_id === list.id);
    const visibleListTasks = allListTasks.filter(filterTask);
    const pendingTasks = visibleListTasks.filter(t => !t.done);
    const doneTasks = visibleListTasks.filter(t => t.done);
    const doneCount = allListTasks.filter(t => t.done).length;
    const totalCount = allListTasks.length;
    const isCollapsed = collapsedLists.has(list.id);

    return (
      <div key={list.id} className="border border-border rounded-xl bg-card overflow-hidden">
        {/* List header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50">
          <button onClick={() => toggleCollapsed(list.id)} className="text-muted-foreground hover:text-foreground transition-colors">
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
          </button>
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--client-500, hsl(var(--primary)))' }} />
          <div className="flex-1 min-w-0">
            <span className="text-xs text-muted-foreground">{doneCount}/{totalCount} concluídas</span>
            <EditableText
              text={list.title}
              className="text-lg font-bold text-foreground block"
              onSave={(title) => updateListTitle(list.id, title)}
            />
          </div>
          {/* List menu */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-secondary">
                <MoreHorizontal size={16} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-36 p-1" align="end">
              <button onClick={() => { setDeleteListId(list.id); setDeleteListDialogOpen(true); }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-destructive hover:bg-destructive/10 transition-colors">
                <Trash2 size={12} /> Excluir lista
              </button>
            </PopoverContent>
          </Popover>
        </div>

        {/* Tasks */}
        {!isCollapsed && (
          <SortableContext items={pendingTasks.map(t => t.id)} strategy={verticalListSortingStrategy} id={`list-${list.id}`}>
            <div className="min-h-[2px]" data-list-id={list.id}>
              {/* Pending tasks */}
              {pendingTasks.map(task => <SortableTaskRow key={task.id} task={task} />)}

              {/* Add task button */}
              {addingToList === list.id ? (
                <form onSubmit={(e) => { e.preventDefault(); addTask(list.id); }}
                  className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50 bg-secondary/20">
                  <div className="w-5 h-5 rounded border-2 border-dashed border-border/50 flex-shrink-0" />
                  <input ref={newTaskInputRef} value={newTaskText} onChange={e => setNewTaskText(e.target.value)}
                    placeholder="Descreva a tarefa..."
                    className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground/60"
                    onBlur={() => { if (!newTaskText.trim()) { setAddingToList(null); setNewTaskText(''); } }}
                    onKeyDown={e => { if (e.key === 'Escape') { setAddingToList(null); setNewTaskText(''); } }}
                  />
                  <Button type="submit" size="sm" variant="ghost" disabled={!newTaskText.trim()} className="h-7 text-xs">
                    <Plus size={12} className="mr-1" /> Adicionar
                  </Button>
                </form>
              ) : (
                <button onClick={() => { setAddingToList(list.id); setNewTaskText(''); }}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors w-full border-b border-border/50">
                  <Plus size={14} /> Adicionar tarefa
                </button>
              )}

              {/* Done tasks (separated) */}
              {doneTasks.length > 0 && !hideDone && (
                <div className="mt-1">
                  {doneTasks.map(task => <SortableTaskRow key={task.id} task={task} />)}
                </div>
              )}
            </div>
          </SortableContext>
        )}
      </div>
    );
  };

  // ─── Unassigned tasks (no list) ─────────────────────────────────
  const unlistedTasks = useMemo(() => tasks.filter(t => !t.list_id).filter(filterTask), [tasks, filterTask]);

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground text-sm">Carregando...</div>;
  }

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div className="space-y-6">
          {/* Render each list */}
          {lists.map(renderList)}

          {/* Unassigned tasks */}
          {unlistedTasks.length > 0 && (
            <div className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50">
                <div className="w-3 h-3 rounded-full flex-shrink-0 bg-muted-foreground/30" />
                <div className="flex-1">
                  <span className="text-xs text-muted-foreground">{unlistedTasks.filter(t => t.done).length}/{unlistedTasks.length} concluídas</span>
                  <span className="text-lg font-bold text-foreground block">Sem lista</span>
                </div>
              </div>
              <SortableContext items={unlistedTasks.filter(t => !t.done).map(t => t.id)} strategy={verticalListSortingStrategy}>
                {unlistedTasks.filter(t => !t.done).map(task => <SortableTaskRow key={task.id} task={task} />)}
              </SortableContext>
              {unlistedTasks.filter(t => t.done).length > 0 && !hideDone && (
                <div className="mt-1">
                  {unlistedTasks.filter(t => t.done).map(task => <SortableTaskRow key={task.id} task={task} />)}
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {lists.length === 0 && unlistedTasks.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Nenhuma lista de tarefas ainda. Crie uma para começar!
            </div>
          )}

          {/* New list button */}
          {showNewListInput ? (
            <form onSubmit={(e) => { e.preventDefault(); createList(); }}
              className="border border-dashed border-border rounded-xl p-5 bg-secondary/10">
              <input ref={newListInputRef} value={creatingListName} onChange={e => setCreatingListName(e.target.value)}
                placeholder="Nome da lista..."
                className="text-lg font-bold bg-transparent outline-none w-full text-foreground placeholder:text-muted-foreground/60 mb-3"
                onKeyDown={e => { if (e.key === 'Escape') { setShowNewListInput(false); setCreatingListName(''); } }}
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={!creatingListName.trim()}
                  style={{ backgroundColor: 'var(--client-500, hsl(var(--primary)))', color: '#ffffff' }}>
                  <Plus size={14} className="mr-1" /> Criar lista
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => { setShowNewListInput(false); setCreatingListName(''); }}>
                  Cancelar
                </Button>
              </div>
            </form>
          ) : (
            <Button variant="outline" onClick={() => setShowNewListInput(true)} className="gap-1.5"
              style={{ borderColor: 'var(--client-500, hsl(var(--primary)))', color: 'var(--client-500, hsl(var(--primary)))' }}>
              <Plus size={16} /> Nova lista
            </Button>
          )}
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {activeTask ? (
            <div className="bg-card border border-border rounded-lg shadow-lg px-4 py-2.5 opacity-90">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-5 h-5 rounded border-2 flex items-center justify-center",
                  activeTask.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-border"
                )}>
                  {activeTask.done && <span className="text-[10px] font-bold">✓</span>}
                </div>
                <span className="text-sm">{activeTask.text}</span>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Delete task dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { if (deleteTaskId) await deleteTask(deleteTaskId); setDeleteTaskId(null); setDeleteDialogOpen(false); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete list dialog */}
      <AlertDialog open={deleteListDialogOpen} onOpenChange={setDeleteListDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lista</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza? Todas as tarefas desta lista serão excluídas permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { if (deleteListId) await deleteList(deleteListId); setDeleteListId(null); setDeleteListDialogOpen(false); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TaskListCard;
