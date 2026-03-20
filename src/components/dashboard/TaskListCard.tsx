import { useState, useEffect, useRef, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Link } from 'react-router-dom';
import RichTextEditor from '@/components/content/RichTextEditor';
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
import { toast } from 'sonner';
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
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Task {
  id: string;
  text: string;
  done: boolean;
  sort_order: number;
  list_id: string | null;
  assigned_to: string | null;
  due_date: string | null;
  status: TaskStatus;
  priority: TaskPriority;
}

interface TaskList {
  id: string;
  title: string;
  description?: string | null;
  file_urls?: string[] | null;
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

export interface TaskListCardHandle {
  triggerNewList: () => void;
}

interface TaskListCardProps {
  projectId: string;
  hideDone?: boolean;
  filters?: TaskFilters;
  showNewListInline?: boolean;
  singleListId?: string;
}

type TaskStatus = 'backlog' | 'planning' | 'in_progress' | 'paused' | 'done' | 'cancelled' | 'group';
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent' | string;

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

const GROUP_COLORS = [
  { value: '#f5f5f5', label: 'Cinza' },
  { value: '#e2e8f0', label: 'Slate' },
  { value: '#fee2e2', label: 'Vermelho' },
  { value: '#fef3c7', label: 'Amarelo' },
  { value: '#dcfce7', label: 'Verde' },
  { value: '#dbeafe', label: 'Azul' },
  { value: '#f3e8ff', label: 'Roxo' },
  { value: '#fae8ff', label: 'Rosa' },
];

const getTaskStatus = (done: boolean, status?: TaskStatus): TaskStatus => {
  if (status) return status;
  return done ? 'done' : 'backlog';
};

const TaskListPieChart = ({ total, completed }: { total: number; completed: number }) => {
  const percentage = total > 0 ? (completed / total) : 0;
  const x = 10 + 10 * Math.sin(Math.PI * 2 * percentage);
  const y = 10 - 10 * Math.cos(Math.PI * 2 * percentage);
  const largeArcFlag = percentage > 0.5 ? 1 : 0;
  const pathData = percentage === 1 
    ? "M 10 10 m -10 0 a 10 10 0 1 0 20 0 a 10 10 0 1 0 -20 0" 
    : percentage <= 0 ? "" : `M 10 10 L 10 0 A 10 10 0 ${largeArcFlag} 1 ${x} ${y} Z`;

  return (
    <div className="w-5 h-5 flex-shrink-0">
      <svg viewBox="0 0 20 20" className="w-full h-full overflow-visible">
        <circle cx="10" cy="10" r="10" className="fill-slate-200 dark:fill-slate-800" />
        {percentage > 0 && (
          <path d={pathData} style={{ fill: 'hsl(var(--primary))' }} />
        )}
      </svg>
    </div>
  );
};

// ─── Inline editable text ────────────────────────────────────────
const EditableText = ({ text, className, onSave }: { text: string; className?: string; onSave: (text: string) => void }) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(text);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setValue(text); }, [text]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  const commit = () => { setEditing(false); if (value.trim() && value.trim() !== text) onSave(value.trim()); else setValue(text); };
  if (editing) return <input ref={inputRef} value={value} onChange={e => setValue(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setValue(text); setEditing(false); }}} className={cn("bg-transparent border-b border-primary/40 outline-none w-full", className)} />;
  return <span onDoubleClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditing(true); }} className={cn("cursor-pointer", className)} title="Clique duplo para editar">{text}</span>;
};

// ─── Status badge with popover ───────────────────────────────────
const StatusBadge = ({ status, onChange }: { status: TaskStatus; onChange: (status: TaskStatus) => void }) => {
  const [open, setOpen] = useState(false);
  const currentOption = STATUS_OPTIONS.find(s => s.value === status) ?? STATUS_OPTIONS[0];
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors", currentOption.color)}>
          {currentOption.label}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-1" align="start">
        {STATUS_GROUPS.map(group => (
          <div key={group.key}>
            <div className="px-2 py-1 text-xs font-medium text-muted-foreground">{group.label}</div>
            {STATUS_OPTIONS.filter(opt => opt.group === group.key).map(opt => (
              <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); }} className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors hover:bg-secondary", status === opt.value && "bg-secondary")}>
                <span className={cn("w-2 h-2 rounded-full", opt.value === 'backlog' ? 'bg-muted-foreground' : opt.value === 'planning' ? 'bg-blue-500' : opt.value === 'in_progress' ? 'bg-orange-500' : opt.value === 'paused' ? 'bg-purple-500' : opt.value === 'done' ? 'bg-green-500' : 'bg-red-500')} />
                {opt.label}
              </button>
            ))}
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
};

// ─── Assignee selector ──────────────────────────────────────────
const AssigneeSelector = ({ value, onChange, members, getMemberInitials, getMemberName }: { value: string | null; onChange: (v: string | null) => void, members: MemberProfile[], getMemberInitials: (id: string | null) => string, getMemberName: (id: string | null) => string | null }) => {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {value ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white text-[9px] shadow-sm transform hover:scale-105 transition-transform" style={{ backgroundColor: 'hsl(var(--primary))' }}>
                {getMemberInitials(value)}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">{getMemberName(value)}</TooltipContent>
          </Tooltip>
        ) : (
          <button className="flex-shrink-0 text-slate-400 hover:text-primary transition-colors" title="Atribuir responsável"><UserPlus size={14} /></button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="end">
        <div className="text-xs font-medium text-muted-foreground px-2 py-1.5">Responsável</div>
        {value && <button onClick={() => { onChange(null); setOpen(false); }} className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-secondary/80 text-muted-foreground"><X size={14} /><span>Remover</span></button>}
        {members.map(m => (
          <button key={m.user_id} onClick={() => { onChange(m.user_id); setOpen(false); }} className={cn("w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-secondary/80 transition-colors", value === m.user_id && "bg-secondary")}>
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0" style={{ backgroundColor: 'hsl(var(--primary))' }}>{getMemberInitials(m.user_id)}</div>
            <span className="truncate">{m.display_name || 'Usuário'}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
};

const GroupDivider = ({ task, onSave, onDelete }: { task: Task; onSave: (id: string, text: string) => void; onDelete: (id: string) => void }) => {
  return (
    <div className="flex items-center gap-2 group/group relative py-3 mt-6 mb-2 first:mt-0">
      <div className={cn("px-2.5 py-0.5 rounded-md text-[13px] font-bold shadow-sm border border-black/5")} style={{ backgroundColor: task.priority || '#f5f5f5' }}>
        <EditableText text={task.text} onSave={(t) => onSave(task.id, t)} className="cursor-pointer" />
      </div>
      <div className="flex-1 h-[1px] bg-slate-100" />
      <button onClick={() => onDelete(task.id)} className="opacity-0 group-hover/group:opacity-100 text-slate-300 hover:text-red-500 transition-opacity p-1">
        <X size={14} />
      </button>
    </div>
  );
};

const TaskRow = ({ 
  task, toggleDone, updateTaskText, updateTaskStatus, updatePriority, updateDueDate, updateAssignee, setDeleteTaskId, setDeleteDialogOpen,
  members, getMemberInitials, getMemberName, getDueDateStyle, deleteTask
}: { 
  task: Task; toggleDone: (id: string) => void; updateTaskText: (id: string, text: string) => void; updateTaskStatus: (id: string, status: TaskStatus) => void;
  updatePriority: (id: string, priority: TaskPriority) => void; updateDueDate: (id: string, date: Date | undefined) => void; updateAssignee: (id: string, userId: string | null) => void;
  setDeleteTaskId: (id: string) => void; setDeleteDialogOpen: (open: boolean) => void; members: MemberProfile[]; getMemberInitials: (id: string | null) => string;
  getMemberName: (id: string | null) => string | null; getDueDateStyle: (date: string | null, done: boolean) => string; deleteTask?: (id: string) => void;
}) => {
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  
  if (task.status === 'group') {
    return <GroupDivider task={task} onSave={updateTaskText} onDelete={deleteTask || (() => {})} />;
  }

  return (
    <div className={cn("group/task flex items-center gap-3 py-1.5 transition-colors", task.done && "opacity-60")}>
      <button onClick={() => toggleDone(task.id)} className="flex-shrink-0">
        <div className={cn("w-[1.1rem] h-[1.1rem] rounded border flex items-center justify-center transition-all", task.done ? "border-emerald-500 bg-emerald-50 text-emerald-600" : "border-slate-400 hover:border-slate-600 bg-[#c5daf7] shadow-sm")}>
          {task.done && <span className="text-[10px] font-bold">✓</span>}
        </div>
      </button>
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <EditableText text={task.text} className={cn("text-[15px] font-normal text-slate-700 dark:text-slate-200", task.done && "line-through text-slate-400")} onSave={(t) => updateTaskText(task.id, t)} />
        <div className="flex items-center gap-3 flex-shrink-0">
          <AssigneeSelector value={task.assigned_to} onChange={(v) => updateAssignee(task.id, v)} members={members} getMemberInitials={getMemberInitials} getMemberName={getMemberName} />
          
          <div className="flex items-center gap-1">
            {task.due_date && (
              <button onClick={() => setDatePopoverOpen(true)} className={cn("flex items-center gap-1 text-[12px] font-medium px-1.5 py-0.5 rounded hover:bg-slate-100", getDueDateStyle(task.due_date, task.done))}>
                <CalendarIcon size={12} className="opacity-70" />
                <span>{format(new Date(task.due_date + 'T00:00:00'), "eee, MMM d", { locale: ptBR })}</span>
              </button>
            )}
            
            <div className="flex items-center gap-1 opacity-0 group-hover/task:opacity-100 transition-opacity">
              <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                <PopoverTrigger asChild><button className="p-1 text-slate-400 hover:text-slate-600"><CalendarIcon size={14} /></button></PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar mode="single" selected={task.due_date ? new Date(task.due_date + 'T00:00:00') : undefined} onSelect={(d) => { updateDueDate(task.id, d); setDatePopoverOpen(false); }} className="p-3" />
                  {task.due_date && <div className="p-2 border-t"><Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => { updateDueDate(task.id, undefined); setDatePopoverOpen(false); }}>Remover data</Button></div>}
                </PopoverContent>
              </Popover>
              <button onClick={() => { setDeleteTaskId(task.id); setDeleteDialogOpen(true); }} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SortableTaskRow = ({ task, ...props }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, data: { type: 'task', task } });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }} className="relative group/sortable">
      <div {...attributes} {...listeners} className="absolute -left-7 top-2 cursor-grab active:cursor-grabbing opacity-0 group-hover/sortable:opacity-20 transition-opacity">
        <div className="flex flex-col gap-[2px]">{[1,2,3].map(i => <div key={i} className="w-4 border-t border-slate-900" />)}</div>
      </div>
      <TaskRow task={task} {...props} />
    </div>
  );
};

const SortableTaskList = ({ list, renderList, hideHandle, onEdit, onAddTask, onDelete, onAddGroup }: { 
  list: TaskList; 
  renderList: (list: TaskList, handleProps?: { attributes: any; listeners: any }) => React.ReactNode; 
  hideHandle?: boolean;
  onEdit: (id: string) => void;
  onAddTask: (id: string) => void;
  onDelete: (id: string) => void;
  onAddGroup: (id: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: list.id, data: { type: 'list', list } });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const [open, setOpen] = useState(false);
  
  return (
    <div ref={setNodeRef} style={style} className="relative group/list-sortable">
      {renderList(list, hideHandle ? undefined : { attributes, listeners })}
    </div>
  );
};

const TaskListCard = forwardRef<TaskListCardHandle, TaskListCardProps>(({ projectId, hideDone = false, filters, showNewListInline = true, singleListId }, ref) => {
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
  const [creatingListDescription, setCreatingListDescription] = useState('');
  const [showNewListDetails, setShowNewListDetails] = useState(false);
  const [showNewListInput, setShowNewListInput] = useState(false);
  const [addingToList, setAddingToList] = useState<string | null>(null);
  const [addingGroupToList, setAddingGroupToList] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState(GROUP_COLORS[0].value);
  const [newTaskAssignee, setNewTaskAssignee] = useState<string | null>(null);
  const [newTaskDueDate, setNewTaskDueDate] = useState<Date | undefined>(undefined);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeList, setActiveList] = useState<TaskList | null>(null);
  const newListInputRef = useRef<HTMLInputElement>(null);
  const newTaskInputRef = useRef<HTMLInputElement>(null);
  const groupInputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({ triggerNewList: () => { setShowNewListInput(true); setTimeout(() => newListInputRef.current?.focus(), 100); }}));
  useEffect(() => { fetchAll(); }, [projectId, user]);
  useEffect(() => { if (showNewListInput) newListInputRef.current?.focus(); }, [showNewListInput]);
  useEffect(() => { if (addingToList) newTaskInputRef.current?.focus(); }, [addingToList]);
  useEffect(() => { if (addingGroupToList) groupInputRef.current?.focus(); }, [addingGroupToList]);

  const fetchAll = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [{ data: tasksData }, { data: listsData }, { data: memberRows }, { data: project }] = await Promise.all([
        supabase.from('project_tasks').select('*').eq('project_id', projectId).order('sort_order'),
        supabase.from('task_lists').select('*').eq('project_id', projectId).order('sort_order'),
        supabase.from('project_members').select('user_id').eq('project_id', projectId),
        supabase.from('projects').select('owner_id').eq('id', projectId).single()
      ]);
      if (tasksData) setTasks(tasksData as Task[]);
      if (listsData) setLists(listsData as TaskList[]);
      const uids = new Set((memberRows || []).map(m => m.user_id));
      if (project?.owner_id) uids.add(project.owner_id);
      if (uids.size) {
        const { data: profiles } = await supabase.from('profiles').select('user_id, display_name, avatar_url').in('user_id', Array.from(uids));
        setMembers(profiles as MemberProfile[] ?? []);
      }
    } catch (error) {
      console.error('Error fetching list data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createList = async () => {
    if (!creatingListName.trim() || !user) return;
    const { data, error } = await supabase.from('task_lists').insert({ project_id: projectId, title: creatingListName.trim(), description: creatingListDescription, sort_order: lists.length, created_by: user.id } as any).select().single();
    if (error) { toast.error('Erro ao criar lista'); return; }
    if (data) setLists(p => [...p, data as TaskList]);
    setCreatingListName(''); setCreatingListDescription(''); setShowNewListDetails(false); setShowNewListInput(false);
    toast.success('Lista criada!');
  };

  const updateListTitle = (id: string, title: string) => { setLists(p => p.map(l => l.id === id ? { ...l, title } : l)); supabase.from('task_lists').update({ title } as any).eq('id', id).then(); };
  const deleteList = async (id: string) => { setLists(p => p.filter(l => l.id !== id)); setTasks(p => p.filter(t => t.list_id !== id)); await supabase.from('task_lists').delete().eq('id', id); fetchAll(); };

  const addTask = async (lid: string) => {
    if (!newTaskText.trim() || !user) return;
    const { data: newTask, error } = await supabase.from('project_tasks').insert({ 
      project_id: projectId, 
      text: newTaskText.trim(), 
      created_by: user.id, 
      sort_order: tasks.filter(t => t.list_id === lid).length, 
      list_id: lid, 
      assigned_to: newTaskAssignee, 
      due_date: newTaskDueDate ? format(newTaskDueDate, 'yyyy-MM-dd') : null,
      status: 'backlog'
    } as any).select().single();
    
    if (error) return;
    if (newTask) {
      setTasks(p => [...p, newTask as Task]);
      resetNewTaskForm(false);
      setTimeout(() => newTaskInputRef.current?.focus(), 50);
    }
  };

  const addGroup = async (lid: string) => {
    if (!newGroupName.trim() || !user) return;
    const { data: ng, error } = await supabase.from('project_tasks').insert({ 
      project_id: projectId, 
      text: newGroupName.trim(), 
      created_by: user.id, 
      sort_order: tasks.filter(t => t.list_id === lid).length, 
      list_id: lid, 
      status: 'group',
      priority: newGroupColor
    } as any).select().single();
    if (error) return;
    if (ng) { setTasks(p => [...p, ng as Task]); setAddingGroupToList(null); setNewGroupName(''); }
  };

  const resetNewTaskForm = (close = true) => { 
    if (close) setAddingToList(null); 
    setNewTaskText(''); 
    setNewTaskAssignee(null); 
    setNewTaskDueDate(undefined); 
  };
  const toggleDone = (id: string) => { const t = tasks.find(x => x.id === id); if (!t) return; const done = !t.done; setTasks(prev => prev.map(x => x.id === id ? { ...x, done, status: done ? 'done' : 'backlog' } : x)); supabase.from('project_tasks').update({ status: done ? 'done' : 'backlog', done }).eq('id', id); };
  const updateTaskStatus = (id: string, s: TaskStatus) => { setTasks(prev => prev.map(t => t.id === id ? { ...t, status: s, done: s === 'done' } : t)); supabase.from('project_tasks').update({ status: s, done: s === 'done' }).eq('id', id); };
  const updatePriority = (id: string, priority: TaskPriority) => { setTasks(prev => prev.map(t => t.id === id ? { ...t, priority } : t)); supabase.from('project_tasks').update({ priority }).eq('id', id); };
  const updateDueDate = (id: string, d: Date | undefined) => { const ds = d ? format(d, 'yyyy-MM-dd') : null; setTasks(prev => prev.map(t => t.id === id ? { ...t, due_date: ds } : t)); supabase.from('project_tasks').update({ due_date: ds } as any).eq('id', id); };
  const updateAssignee = (id: string, val: string | null) => { setTasks(prev => prev.map(t => t.id === id ? { ...t, assigned_to: val } : t)); supabase.from('project_tasks').update({ assigned_to: val } as any).eq('id', id); };
  const updateTaskText = (id: string, text: string) => { if (!text.trim()) return; setTasks(prev => prev.map(t => t.id === id ? { ...t, text: text.trim() } : t)); supabase.from('project_tasks').update({ text: text.trim() }).eq('id', id); };
  const deleteTask = async (id: string) => { setTasks(p => p.filter(t => t.id !== id)); await supabase.from('project_tasks').delete().eq('id', id); };

  const getMemberName = (id: string | null) => members.find(m => m.user_id === id)?.display_name || null;
  const getMemberInitials = (id: string | null) => { const n = getMemberName(id); return n ? n.split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2) : '?'; };
  const getDueDateStyle = (due_date: string | null, done: boolean) => { 
    if (!due_date || done) return 'text-slate-400'; 
    const d = new Date(due_date + 'T00:00:00'); 
    const isTodayFn = (date: Date) => isToday(date);
    const isPastFn = (date: Date) => isPast(date);

    if (isTodayFn(d)) return 'text-amber-600'; 
    if (isPastFn(d)) return 'text-red-500'; 
    return 'text-slate-500'; 
  };

  const filterTask = useCallback((t: Task) => {
    if (hideDone && t.done) return false;
    if (t.status === 'group') return true;
    if (!filters) return true;
    if (filters.statuses.length && !filters.statuses.includes(getTaskStatus(t.done, t.status) as any)) return false;
    if (filters.dateFilter !== 'all') {
      const now = new Date();
      const isTodayFn = (date: Date) => isToday(date);
      const isPastFn = (date: Date) => isPast(date);
      switch (filters.dateFilter) {
        case 'no_date': return !t.due_date;
        case 'today': return t.due_date ? isTodayFn(new Date(t.due_date + 'T00:00:00')) : false;
        case 'overdue': return t.due_date ? isPastFn(new Date(t.due_date + 'T00:00:00')) && !isTodayFn(new Date(t.due_date + 'T00:00:00')) && !t.done : false;
        case 'this_week': { const d = t.due_date ? new Date(t.due_date + 'T00:00:00') : null; return d ? d >= startOfWeek(now, { weekStartsOn: 1 }) && d <= endOfWeek(now, { weekStartsOn: 1 }) : false; }
      }
    }
    return true;
  }, [hideDone, filters]);

  const handleDragStart = (e: DragStartEvent) => { 
    const { active } = e;
    if (active.data.current?.type === 'task') {
      const t = tasks.find(x => x.id === active.id); if (t) setActiveTask(t);
    } else if (active.data.current?.type === 'list') {
      const l = lists.find(x => x.id === active.id); if (l) setActiveList(l);
    }
  };
  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e; if (!over || active.id === over.id || active.data.current?.type !== 'task') return;
    const aTask = tasks.find(t => t.id === active.id); const oTask = tasks.find(t => t.id === over.id);
    if (!aTask || !oTask || aTask.list_id === oTask.list_id) return;
    setTasks(prev => {
      const aIdx = prev.findIndex(t => t.id === active.id); const oIdx = prev.findIndex(t => t.id === over.id);
      const updated = [...prev]; updated[aIdx] = { ...updated[aIdx], list_id: oTask.list_id };
      return arrayMove(updated, aIdx, oIdx);
    });
  };
  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveTask(null); setActiveList(null); if (!e.over || e.active.id === e.over.id) return;
    const { active, over } = e;
    
    if (active.data.current?.type === 'task') {
      const aIdx = tasks.findIndex(t => t.id === active.id); const oIdx = tasks.findIndex(t => t.id === over.id);
      const newTasks = arrayMove(tasks, aIdx, oIdx); setTasks(newTasks);
      const lid = tasks[aIdx].list_id; const lTasks = newTasks.filter(t => t.list_id === lid);
      await Promise.all(lTasks.map((t, idx) => supabase.from('project_tasks').update({ sort_order: idx, list_id: lid }).eq('id', t.id)));
    } else if (active.data.current?.type === 'list') {
      const aIdx = lists.findIndex(l => l.id === active.id); const oIdx = lists.findIndex(l => l.id === over.id);
      const newLists = arrayMove(lists, aIdx, oIdx); setLists(newLists);
      await Promise.all(newLists.map((l, idx) => supabase.from('task_lists').update({ sort_order: idx }).eq('id', l.id)));
    }
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const displayedLists = useMemo(() => {
    if (singleListId) return lists.filter(l => l.id === singleListId);
    return lists;
  }, [lists, singleListId]);

  const renderList = (list: TaskList) => {
    const lTasks = tasks.filter(t => t.list_id === list.id).filter(filterTask);
    const doneT = lTasks.filter(t => t.done && t.status !== 'group');
    const pendT = lTasks.filter(t => !t.done || t.status === 'group');
    const totalT = lTasks.filter(t => t.status !== 'group').length;

    return (
      <div className="mb-12 pl-12 relative group/list">
        <div className="mb-4">
          <div className="text-[12px] text-muted-foreground font-medium mb-1 tracking-tight">{doneT.length}/{totalT} concluídas</div>
          <div className="flex items-start gap-4">
            <TaskListPieChart total={totalT} completed={doneT.length} />
            <div className="flex-1">
              <div className="flex items-center gap-2 group/title">
                <Link to={`/clients/${projectId}/tasks/${list.id}`} className="hover:opacity-80 transition-opacity">
                  <EditableText 
                    text={list.title} 
                    className="text-[22px] font-bold text-primary" 
                    onSave={(t) => updateListTitle(list.id, t)} 
                  />
                </Link>
                <button onClick={() => { setDeleteListId(list.id); setDeleteListDialogOpen(true); }} className="opacity-0 group-hover/list:opacity-100 hover:text-red-500 text-slate-400 p-2 transition-opacity">
                  <Trash2 size={18} />
                </button>
              </div>
              {list.description && <div className="mt-2 text-sm text-muted-foreground italic max-w-2xl line-clamp-1 leading-relaxed">{list.description.replace(/<[^>]*>?/gm, ' ')}</div>}
            </div>
          </div>
        </div>
        <div className="space-y-0.5">
          <SortableContext items={pendT.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {pendT.map(task => <SortableTaskRow key={task.id} task={task} toggleDone={toggleDone} updateTaskText={updateTaskText} updateTaskStatus={updateTaskStatus} updatePriority={updatePriority} updateDueDate={updateDueDate} updateAssignee={updateAssignee} setDeleteTaskId={setDeleteTaskId} setDeleteDialogOpen={setDeleteDialogOpen} members={members} getMemberInitials={getMemberInitials} getMemberName={getMemberName} getDueDateStyle={getDueDateStyle} deleteTask={deleteTask} />)}
          </SortableContext>
          
          {addingGroupToList === list.id && (
            <div className="my-6 max-w-2xl bg-[#c5daf7] border rounded-xl shadow-xl p-6 border-primary/20 animate-in slide-in-from-top-1 duration-200 font-jakarta">
              <input ref={groupInputRef} autoFocus value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Adicionar um novo grupo..." className="w-full text-lg font-bold outline-none mb-4" />
              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  {GROUP_COLORS.map(c => (
                    <button key={c.value} onClick={() => setNewGroupColor(c.value)} className={cn("w-6 h-6 rounded-full border border-black/5 flex items-center justify-center transition-all hover:scale-110", newGroupColor === c.value && "ring-2 ring-primary ring-offset-1")} style={{ backgroundColor: c.value }}>
                      {newGroupColor === c.value && <span className="text-[10px] drop-shadow-sm">✓</span>}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => addGroup(list.id)} size="sm" className="rounded-full bg-primary text-white hover:bg-primary/90 px-6">Adicionar grupo</Button>
                  <Button variant="ghost" size="sm" onClick={() => { setAddingGroupToList(null); setNewGroupName(''); }} className="rounded-full">Cancelar</Button>
                </div>
              </div>
            </div>
          )}

          <div className="pt-3">
            {addingToList === list.id ? (
              <form onSubmit={(e) => { e.preventDefault(); addTask(list.id); }} className="max-w-xl bg-[#c5daf7] border rounded-xl shadow-lg p-5 border-primary/20 animate-in slide-in-from-top-1 duration-200">
                <input ref={newTaskInputRef} autoFocus value={newTaskText} onChange={e => setNewTaskText(e.target.value)} placeholder="Descreva a tarefa..." className="w-full text-lg outline-none mb-4" />
                <div className="flex gap-2"><Button type="submit" size="sm" className="rounded-full bg-primary text-white hover:bg-primary/90 px-6">Adicionar</Button><Button type="button" size="sm" variant="ghost" onClick={() => resetNewTaskForm()} className="rounded-full">Cancelar</Button></div>
              </form>
            ) : <button onClick={() => setAddingToList(list.id)} className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-slate-200 text-slate-500 text-sm font-bold hover:bg-slate-50 transition-all shadow-sm">Adicionar tarefa</button>}
          </div>
          {doneT.length > 0 && !hideDone && <div className="mt-6 pt-4 border-t border-slate-100">{doneT.map(task => <TaskRow key={task.id} task={task} toggleDone={toggleDone} updateTaskText={updateTaskText} updateTaskStatus={updateTaskStatus} updatePriority={updatePriority} updateDueDate={updateDueDate} updateAssignee={updateAssignee} setDeleteTaskId={setDeleteTaskId} setDeleteDialogOpen={setDeleteDialogOpen} members={members} getMemberInitials={getMemberInitials} getMemberName={getMemberName} getDueDateStyle={getDueDateStyle} deleteTask={deleteTask} />)}</div>}
        </div>
      </div>
    );
  };

  const unlistedTasks = useMemo(() => tasks.filter(t => !t.list_id).filter(filterTask), [tasks, filterTask]);
  if (loading) return <div className="text-center py-20 text-slate-400">Carregando...</div>;

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div className="w-full py-12 px-6" style={{ '--primary': '214 84% 47%', '--ring': '214 84% 47%' } as any}>
          <SortableContext items={displayedLists.map(l => l.id)} strategy={verticalListSortingStrategy}>
            {displayedLists.map(list => (
              <SortableTaskList 
                key={list.id} 
                list={list} 
                renderList={renderList} 
                hideHandle={!!singleListId} 
                onEdit={(id) => console.log('Edit list', id)}
                onAddTask={(id) => setAddingToList(id)}
                onDelete={(id) => { setDeleteListId(id); setDeleteListDialogOpen(true); }}
                onAddGroup={(id) => setAddingGroupToList(id)}
              />
            ))}
          </SortableContext>
          {!singleListId && unlistedTasks.length > 0 && (
            <div className="pl-12 mt-16 border-t border-border pt-10 font-jakarta">
              <div className="flex items-center gap-4 mb-6">
                <TaskListPieChart total={unlistedTasks.length} completed={unlistedTasks.filter(t => t.done).length} />
                <span className="text-2xl font-bold text-foreground">Sem lista</span>
              </div>
              <SortableContext items={unlistedTasks.filter(t => !t.done).map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-0.5">
                  {unlistedTasks.filter(t => !t.done).map(task => (
                    <SortableTaskRow 
                      key={task.id} task={task} 
                      toggleDone={toggleDone} updateTaskText={updateTaskText} updateTaskStatus={updateTaskStatus} 
                      updatePriority={updatePriority} updateDueDate={updateDueDate} updateAssignee={updateAssignee} 
                      setDeleteTaskId={setDeleteTaskId} setDeleteDialogOpen={setDeleteDialogOpen} 
                      members={members} getMemberInitials={getMemberInitials} 
                      getMemberName={getMemberName} getDueDateStyle={getDueDateStyle} deleteTask={deleteTask}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>
          )}
          {!singleListId && showNewListInput && (
            <div className="pl-12 mt-10">
              <form onSubmit={e => { e.preventDefault(); createList(); }} className="max-w-xl bg-[#c5daf7] border border-primary/20 rounded-2xl p-8 shadow-xl">
                <input ref={newListInputRef} value={creatingListName} onChange={e => setCreatingListName(e.target.value)} placeholder="Nome da lista..." className="text-2xl font-bold text-primary outline-none w-full mb-4" />
                {!showNewListDetails ? <button type="button" onClick={() => setShowNewListDetails(true)} className="text-slate-500 hover:text-primary mb-6 block text-sm">Adicionar detalhes ou anexos...</button> : <div className="mb-6"><RichTextEditor content={creatingListDescription} onChange={setCreatingListDescription} contentId={user?.id} /></div>}
                <div className="flex gap-3"><Button type="submit" disabled={!creatingListName.trim()} className="rounded-full px-8 bg-primary text-white">Criar lista</Button><Button type="button" variant="ghost" onClick={() => setShowNewListInput(false)} className="rounded-full">Cancelar</Button></div>
              </form>
            </div>
          )}
        </div>
        <DragOverlay>
          {activeTask ? (
            <div className="bg-[#c5daf7] border rounded-xl shadow-2xl px-6 py-3 border-primary/20 flex items-center gap-4 animate-in fade-in duration-200">
              <div className={cn("w-5 h-5 rounded border", activeTask.done ? "bg-emerald-500 border-emerald-500" : "border-slate-300")} />
              <span className="text-lg font-medium text-slate-700">{activeTask.text}</span>
            </div>
          ) : activeList ? (
            <div className="bg-[#c5daf7] border rounded-2xl shadow-2xl px-8 py-6 border-primary/20 flex flex-col gap-2 min-w-[300px] animate-in fade-in duration-200">
              <div className="flex items-center gap-3"><GripVertical size={20} className="text-primary/40" /><span className="text-2xl font-bold text-primary">{activeList.title}</span></div>
              <div className="h-2 w-24 bg-slate-100 rounded-full" />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}><AlertDialogContent className="rounded-3xl"><AlertDialogHeader><AlertDialogTitle>Excluir tarefa</AlertDialogTitle><AlertDialogDescription>Deseja remover esta tarefa?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="rounded-full">Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { if (deleteTaskId) deleteTask(deleteTaskId); setDeleteDialogOpen(false); }} className="bg-red-500 text-white rounded-full">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={deleteListDialogOpen} onOpenChange={setDeleteListDialogOpen}><AlertDialogContent className="rounded-3xl"><AlertDialogHeader><AlertDialogTitle>Excluir lista</AlertDialogTitle><AlertDialogDescription>Todas as tarefas serão removidas permanentemente.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="rounded-full">Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { if (deleteListId) deleteList(deleteListId); setDeleteListDialogOpen(false); }} className="bg-red-500 text-white rounded-full">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  );
});

export default TaskListCard;
