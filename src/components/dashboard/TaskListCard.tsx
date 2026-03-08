import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Trash2, ListTodo, CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Task {
  id: string;
  text: string;
  done: boolean;
  sort_order: number;
  due_date: string | null;
}

interface TaskListCardProps {
  projectId: string;
}

const TaskListCard = ({ projectId }: TaskListCardProps) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newText, setNewText] = useState('');
  const [newDueDate, setNewDueDate] = useState<Date | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, [projectId, user]);

  const fetchTasks = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('project_tasks')
      .select('id, text, done, sort_order, due_date')
      .eq('project_id', projectId)
      .eq('created_by', user.id)
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
      } as any)
      .select('id, text, done, sort_order, due_date')
      .single();
    if (data) setTasks(prev => [...prev, data as Task]);
    setNewText('');
    setNewDueDate(undefined);
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
                <span className={cn(
                  "text-sm block truncate transition-colors",
                  t.done ? "line-through text-muted-foreground" : "text-foreground"
                )}>
                  {t.text}
                </span>
                {t.due_date && (
                  <span className={cn("text-[10px] font-medium", getDueDateStyle(t.due_date, t.done))}>
                    {format(new Date(t.due_date + 'T00:00:00'), "dd MMM", { locale: ptBR })}
                  </span>
                )}
              </div>
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
      {newDueDate && (
        <div className="flex items-center gap-1 mt-1.5">
          <span className="text-[10px] text-muted-foreground">
            Data: {format(newDueDate, "dd 'de' MMM, yyyy", { locale: ptBR })}
          </span>
          <button onClick={() => setNewDueDate(undefined)} className="text-muted-foreground hover:text-destructive">
            <X size={10} />
          </button>
        </div>
      )}
    </div>
  );
};

export default TaskListCard;
