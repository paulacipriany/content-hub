import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Trash2, ListTodo, CalendarIcon, X, UserPlus, User } from 'lucide-react';
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
        "text-sm block truncate transition-colors cursor-text",
        done ? "line-through text-muted-foreground" : "text-foreground"
      )}
      title="Clique duplo para editar"
    >
      {text}
    </span>
  );
};

const TaskListCard = ({ projectId }: TaskListCardProps) => {
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
    // Get all project members
    const { data: memberRows } = await supabase
      .from('project_members')
      .select('user_id')
      .eq('project_id', projectId);

    // Also get the project owner
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
      .select('id, text, done, sort_order, due_date, assigned_to, created_by')
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
      .select('id, text, done, sort_order, due_date, assigned_to, created_by')
      .single();
    if (data) setTasks(prev => [...prev, data as Task]);
    setNewText('');
    setNewDueDate(undefined);
    setNewAssignee(null);
  };

  const toggleTask = async (id: string, done: boolean) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done } : t));
    await supabase.from('project_tasks').update({ done }).eq('id', id);
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

  const doneCount = tasks.filter(t => t.done).length;

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

  const AssigneeSelector = ({ value, onChange, size = 'sm' }: { value: string | null; onChange: (v: string | null) => void; size?: 'sm' | 'md' }) => (
    <Popover>
      <PopoverTrigger asChild>
        {value ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  "rounded-full flex items-center justify-center flex-shrink-0 font-bold text-primary-foreground",
                  size === 'sm' ? "w-5 h-5 text-[8px]" : "w-6 h-6 text-[9px]"
                )}
                style={{ backgroundColor: 'var(--client-500, hsl(var(--primary)))' }}
              >
                {getMemberInitials(value)}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">{getMemberName(value)}</TooltipContent>
          </Tooltip>
        ) : (
          <button
            className={cn(
              "flex-shrink-0 text-muted-foreground opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-all",
              size === 'md' && "opacity-100"
            )}
            title="Atribuir responsável"
          >
            <UserPlus size={size === 'sm' ? 13 : 14} />
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

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <ListTodo size={16} style={{ color: 'var(--client-500, hsl(var(--primary)))' }} />
        <h2 className="text-sm font-semibold text-foreground">Tarefas</h2>
        {tasks.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">{doneCount}/{tasks.length}</span>
        )}
      </div>

      {tasks.length > 0 && (
        <div className="h-1.5 rounded-full overflow-hidden mb-4" style={{ backgroundColor: 'var(--client-100, hsl(var(--secondary)))' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${(doneCount / tasks.length) * 100}%`, backgroundColor: 'var(--client-500, hsl(var(--primary)))' }}
          />
        </div>
      )}

      <div className="space-y-1.5 mb-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma tarefa ainda.</p>
        ) : (
          tasks.map(t => (
            <div
              key={t.id}
              className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-secondary/50 transition-colors group"
            >
              <Checkbox
                checked={t.done}
                onCheckedChange={(checked) => toggleTask(t.id, !!checked)}
                className="flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <EditableTaskText
                  text={t.text}
                  done={t.done}
                  onSave={(text) => updateTaskText(t.id, text)}
                />
                <div className="flex items-center gap-2">
                  {t.due_date && (
                    <span className={cn("text-[10px] font-medium", getDueDateStyle(t.due_date, t.done))}>
                      {format(new Date(t.due_date + 'T00:00:00'), "dd MMM", { locale: ptBR })}
                    </span>
                  )}
                  {t.assigned_to && t.assigned_to !== user?.id && (
                    <span className="text-[10px] text-muted-foreground">
                      → {getMemberName(t.assigned_to)}
                    </span>
                  )}
                  {t.created_by !== user?.id && (
                    <span className="text-[10px] text-muted-foreground italic">
                      de {getMemberName(t.created_by)}
                    </span>
                  )}
                </div>
              </div>
              <AssigneeSelector
                value={t.assigned_to}
                onChange={(v) => updateAssignee(t.id, v)}
              />
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
          ))
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); addTask(); }}
        className="flex gap-2"
      >
        <Input
          value={newText}
          onChange={e => setNewText(e.target.value)}
          placeholder="Nova tarefa..."
          className="h-8 text-sm"
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={cn("h-8 px-2 flex-shrink-0", newAssignee && "border-primary/50")}
              title="Atribuir responsável"
            >
              {newAssignee ? (
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold text-primary-foreground"
                  style={{ backgroundColor: 'var(--client-500, hsl(var(--primary)))' }}
                >
                  {getMemberInitials(newAssignee)}
                </div>
              ) : (
                <User size={14} />
              )}
            </Button>
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
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={cn("h-8 px-2 flex-shrink-0", newDueDate && "text-primary")}
              title="Definir data"
            >
              <CalendarIcon size={14} />
            </Button>
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
        <Button type="submit" size="sm" variant="outline" className="h-8 px-2.5 flex-shrink-0" disabled={!newText.trim()}>
          <Plus size={14} />
        </Button>
      </form>
      {(newDueDate || newAssignee) && (
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
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
