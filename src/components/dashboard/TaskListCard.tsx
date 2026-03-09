import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Trash2, CalendarIcon, X, UserPlus, User, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Task {
  id: string;
  text: string;
  done: boolean;
  sort_order: number;
  due_date: string | null;
  assigned_to: string | null;
  created_by: string;
  status?: TaskStatus;
}

interface MemberProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface TaskListCardProps {
  projectId: string;
  hideDone?: boolean;
}

type TaskStatus = 'backlog' | 'planning' | 'in_progress' | 'paused' | 'done' | 'cancelled';

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string; group: string }[] = [
  { value: 'backlog', label: 'Backlog', color: 'bg-muted text-muted-foreground', group: 'A fazer' },
  { value: 'planning', label: 'Planejamento', color: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400', group: 'Em andamento' },
  { value: 'in_progress', label: 'Em andamento', color: 'bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400', group: 'Em andamento' },
  { value: 'paused', label: 'Pausado', color: 'bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400', group: 'Em andamento' },
  { value: 'done', label: 'Concluído', color: 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400', group: 'Completo' },
  { value: 'cancelled', label: 'Cancelado', color: 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400', group: 'Completo' },
];

const STATUS_GROUPS = [
  { key: 'To-do', label: 'To-do' },
  { key: 'In progress', label: 'In progress' },
  { key: 'Complete', label: 'Complete' },
];

const getTaskStatus = (done: boolean, status?: TaskStatus): TaskStatus => {
  if (status) return status;
  return done ? 'done' : 'backlog';
};

const EditableTaskText = ({ text, done, onSave }: { text: string; done: boolean; onSave: (text: string) => void }) => {
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
        className="text-sm bg-transparent border-b border-primary/40 outline-none w-full text-foreground"
      />
    );
  }

  return (
    <span
      onDoubleClick={() => setEditing(true)}
      className={cn(
        "text-sm block transition-colors cursor-text",
        done ? "line-through text-muted-foreground" : "text-foreground"
      )}
      title="Clique duplo para editar"
    >
      {text}
    </span>
  );
};

const StatusBadge = ({ status, onChange }: { status: TaskStatus; onChange: (status: TaskStatus) => void }) => {
  const currentOption = STATUS_OPTIONS.find(s => s.value === status) ?? STATUS_OPTIONS[0];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
            currentOption.color
          )}
        >
          {currentOption.label}
          <ChevronDown size={10} className="opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-1" align="start">
        {STATUS_GROUPS.map(group => (
          <div key={group.key}>
            <div className="px-2 py-1 text-xs font-medium text-muted-foreground">{group.label}</div>
            {STATUS_OPTIONS.filter(opt => opt.group === group.key).map(opt => (
              <button
                key={opt.value}
                onClick={() => onChange(opt.value)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors hover:bg-secondary",
                  status === opt.value && "bg-secondary"
                )}
              >
                <span className={cn("w-2 h-2 rounded-full", 
                  opt.value === 'backlog' ? 'bg-muted-foreground' : 
                  opt.value === 'planning' ? 'bg-blue-500' :
                  opt.value === 'in_progress' ? 'bg-orange-500' :
                  opt.value === 'paused' ? 'bg-purple-500' :
                  opt.value === 'done' ? 'bg-green-500' :
                  'bg-red-500'
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

const TaskListCard = ({ projectId, hideDone = false }: TaskListCardProps) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newText, setNewText] = useState('');
  const [newDueDate, setNewDueDate] = useState<Date | undefined>();
  const [newAssignee, setNewAssignee] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<MemberProfile[]>([]);

  useEffect(() => {
    fetchTasks();
    fetchMembers();
  }, [projectId, user]);

  const fetchMembers = async () => {
    const { data: memberRows } = await supabase
      .from('project_members')
      .select('user_id')
      .eq('project_id', projectId);

    const { data: project } = await supabase
      .from('projects')
      .select('owner_id')
      .eq('id', projectId)
      .single();

    const userIds = new Set<string>();
    (memberRows ?? []).forEach(m => userIds.add(m.user_id));
    if (project?.owner_id) userIds.add(project.owner_id);

    if (userIds.size > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', Array.from(userIds));
      setMembers((profiles as MemberProfile[]) ?? []);
    }
  };

  const fetchTasks = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('project_tasks')
      .select('id, text, done, sort_order, due_date, assigned_to, created_by, status')
      .eq('project_id', projectId)
      .order('sort_order')
      .order('created_at');
    setTasks((data as Task[]) ?? []);
    setLoading(false);
  };

  const addTask = async () => {
    const trimmed = newText.trim();
    if (!trimmed || !user) return;
    const nextOrder = tasks.length > 0 ? Math.max(...tasks.map(t => t.sort_order)) + 1 : 0;
    const { data } = await supabase
      .from('project_tasks')
      .insert({
        project_id: projectId,
        text: trimmed,
        created_by: user.id,
        sort_order: nextOrder,
        due_date: newDueDate ? format(newDueDate, 'yyyy-MM-dd') : null,
        assigned_to: newAssignee,
      } as any)
      .select('id, text, done, sort_order, due_date, assigned_to, created_by, status')
      .single();
    if (data) setTasks(prev => [...prev, data as Task]);
    setNewText('');
    setNewDueDate(undefined);
    setNewAssignee(null);
  };

  const updateTaskStatus = async (id: string, status: TaskStatus) => {
    const done = status === 'done';
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status, done } : t));
    await supabase.from('project_tasks').update({ status, done }).eq('id', id);
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
    const trimmed = text.trim();
    if (!trimmed) return;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, text: trimmed } : t));
    await supabase.from('project_tasks').update({ text: trimmed }).eq('id', id);
  };

  const deleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    await supabase.from('project_tasks').delete().eq('id', id);
  };

  const getDueDateStyle = (due_date: string | null, done: boolean) => {
    if (!due_date || done) return 'text-muted-foreground';
    const date = new Date(due_date + 'T00:00:00');
    if (isToday(date)) return 'text-amber-500';
    if (isPast(date)) return 'text-destructive';
    return 'text-muted-foreground';
  };

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

  const AssigneeSelector = ({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) => (
    <Popover>
      <PopoverTrigger asChild>
        {value ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-primary-foreground text-[9px]"
                style={{ backgroundColor: 'var(--client-500, hsl(var(--primary)))' }}
              >
                {getMemberInitials(value)}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">{getMemberName(value)}</TooltipContent>
          </Tooltip>
        ) : (
          <button
            className="flex-shrink-0 text-muted-foreground opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-all"
            title="Atribuir responsável"
          >
            <UserPlus size={13} />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="end">
        <div className="text-xs font-medium text-muted-foreground px-2 py-1.5">Responsável</div>
        {value && (
          <button
            onClick={() => onChange(null)}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-secondary/80 text-muted-foreground"
          >
            <X size={14} />
            <span>Remover</span>
          </button>
        )}
        {members.map(m => (
          <button
            key={m.user_id}
            onClick={() => onChange(m.user_id)}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-secondary/80 transition-colors",
              value === m.user_id && "bg-secondary"
            )}
          >
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-primary-foreground flex-shrink-0"
              style={{ backgroundColor: 'var(--client-500, hsl(var(--primary)))' }}
            >
              {(m.display_name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <span className="truncate">{m.display_name || 'Usuário'}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );

  const visibleTasks = tasks.filter(t => !(hideDone && t.done));

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Table header */}
      <div className="grid grid-cols-[160px_1fr_auto] border-b border-border bg-secondary/40">
        <div className="px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</div>
        <div className="px-4 py-2.5 text-xs font-medium text-muted-foreground">Tarefa</div>
        <div className="px-4 py-2.5 w-32" />
      </div>

      {/* Rows */}
      {loading ? (
        <div className="px-4 py-6 text-sm text-muted-foreground">Carregando...</div>
      ) : visibleTasks.length === 0 ? (
        <div className="px-4 py-8 text-sm text-muted-foreground text-center">Nenhuma tarefa ainda.</div>
      ) : (
        visibleTasks.map(t => (
          <div
            key={t.id}
            className="grid grid-cols-[160px_1fr_auto] border-b border-border last:border-b-0 hover:bg-secondary/30 transition-colors group"
          >
            {/* Status */}
            <div className="px-4 py-3 flex items-center">
              <StatusBadge status={getTaskStatus(t.done, t.status)} onChange={(status) => updateTaskStatus(t.id, status)} />
            </div>

            {/* Task text + meta */}
            <div className="px-4 py-3 flex flex-col justify-center min-w-0">
              <EditableTaskText
                text={t.text}
                done={t.done}
                onSave={(text) => updateTaskText(t.id, text)}
              />
              <div className="flex items-center gap-2 mt-0.5">
                {t.due_date && (
                  <span className={cn("text-[10px] font-medium", getDueDateStyle(t.due_date, t.done))}>
                    {format(new Date(t.due_date + 'T00:00:00'), "dd MMM", { locale: ptBR })}
                  </span>
                )}
                {t.created_by !== user?.id && (
                  <span className="text-[10px] text-muted-foreground italic">
                    de {getMemberName(t.created_by)}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="px-4 py-3 flex items-center gap-2 w-32 justify-end">
              <AssigneeSelector value={t.assigned_to} onChange={(v) => updateAssignee(t.id, v)} />
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "flex-shrink-0 transition-all",
                      t.due_date
                        ? cn("opacity-60 hover:opacity-100", getDueDateStyle(t.due_date, t.done))
                        : "opacity-0 group-hover:opacity-60 hover:!opacity-100 text-muted-foreground"
                    )}
                    title="Definir data"
                  >
                    <CalendarIcon size={13} />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={t.due_date ? new Date(t.due_date + 'T00:00:00') : undefined}
                    onSelect={(date) => updateDueDate(t.id, date)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                  {t.due_date && (
                    <div className="px-3 pb-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs text-muted-foreground"
                        onClick={() => updateDueDate(t.id, undefined)}
                      >
                        <X size={12} className="mr-1" /> Remover data
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
              <button
                onClick={() => deleteTask(t.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all flex-shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))
      )}

      {/* Add new task row */}
      <form
        onSubmit={(e) => { e.preventDefault(); addTask(); }}
        className="grid grid-cols-[160px_1fr_auto] border-t border-border bg-secondary/20 hover:bg-secondary/40 transition-colors"
      >
        {/* Status placeholder for new task */}
        <div className="px-4 py-2.5 flex items-center">
          <span className="text-xs text-muted-foreground/50 flex items-center gap-1">
            <Plus size={11} /> Nova
          </span>
        </div>

        {/* Input */}
        <div className="px-4 py-2 flex items-center">
          <input
            value={newText}
            onChange={e => setNewText(e.target.value)}
            placeholder="Nova tarefa..."
            className="w-full text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground/60"
          />
        </div>

        {/* Actions for new task */}
        <div className="px-4 py-2 flex items-center gap-1.5 w-32 justify-end">
          {/* Assignee */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn("flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors", newAssignee ? "opacity-100" : "opacity-40 hover:opacity-100")}
                title="Atribuir responsável"
              >
                {newAssignee ? (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-primary-foreground"
                    style={{ backgroundColor: 'var(--client-500, hsl(var(--primary)))' }}
                  >
                    {getMemberInitials(newAssignee)}
                  </div>
                ) : (
                  <User size={13} />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1" align="end">
              <div className="text-xs font-medium text-muted-foreground px-2 py-1.5">Responsável</div>
              {newAssignee && (
                <button
                  type="button"
                  onClick={() => setNewAssignee(null)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-secondary/80 text-muted-foreground"
                >
                  <X size={14} />
                  <span>Remover</span>
                </button>
              )}
              {members.map(m => (
                <button
                  type="button"
                  key={m.user_id}
                  onClick={() => setNewAssignee(m.user_id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-secondary/80 transition-colors",
                    newAssignee === m.user_id && "bg-secondary"
                  )}
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-primary-foreground flex-shrink-0"
                    style={{ backgroundColor: 'var(--client-500, hsl(var(--primary)))' }}
                  >
                    {(m.display_name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <span className="truncate">{m.display_name || 'Usuário'}</span>
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {/* Due date */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn("flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors", newDueDate ? "opacity-100 text-primary" : "opacity-40 hover:opacity-100")}
                title="Definir data"
              >
                <CalendarIcon size={13} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={newDueDate}
                onSelect={setNewDueDate}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          {/* Submit */}
          <button
            type="submit"
            disabled={!newText.trim()}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-all"
            title="Adicionar tarefa"
          >
            <Plus size={15} />
          </button>
        </div>
      </form>

      {(newDueDate || newAssignee) && (
        <div className="flex items-center gap-2 px-4 py-1.5 flex-wrap bg-secondary/20 border-t border-border">
          {newDueDate && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">
                Data: {format(newDueDate, "dd 'de' MMM, yyyy", { locale: ptBR })}
              </span>
              <button onClick={() => setNewDueDate(undefined)} className="text-muted-foreground hover:text-destructive">
                <X size={10} />
              </button>
            </div>
          )}
          {newAssignee && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">
                Para: {getMemberName(newAssignee)}
              </span>
              <button onClick={() => setNewAssignee(null)} className="text-muted-foreground hover:text-destructive">
                <X size={10} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskListCard;
