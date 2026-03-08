import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ListTodo } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  text: string;
  done: boolean;
  sort_order: number;
}

interface TaskListCardProps {
  projectId: string;
}

const TaskListCard = ({ projectId }: TaskListCardProps) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newText, setNewText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, [projectId]);

  const fetchTasks = async () => {
    const { data } = await supabase
      .from('project_tasks')
      .select('id, text, done, sort_order')
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
      .insert({ project_id: projectId, text: trimmed, created_by: user.id, sort_order: nextOrder })
      .select('id, text, done, sort_order')
      .single();
    if (data) setTasks(prev => [...prev, data as Task]);
    setNewText('');
  };

  const toggleTask = async (id: string, done: boolean) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done } : t));
    await supabase.from('project_tasks').update({ done }).eq('id', id);
  };

  const deleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    await supabase.from('project_tasks').delete().eq('id', id);
  };

  const doneCount = tasks.filter(t => t.done).length;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <ListTodo size={16} className="text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Tarefas</h2>
        {tasks.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">{doneCount}/{tasks.length}</span>
        )}
      </div>

      {/* Progress bar */}
      {tasks.length > 0 && (
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${(doneCount / tasks.length) * 100}%` }}
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
              <span className={cn(
                "text-sm flex-1 truncate transition-colors",
                t.done ? "line-through text-muted-foreground" : "text-foreground"
              )}>
                {t.text}
              </span>
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
        <Button type="submit" size="sm" variant="outline" className="h-8 px-2.5 flex-shrink-0" disabled={!newText.trim()}>
          <Plus size={14} />
        </Button>
      </form>
    </div>
  );
};

export default TaskListCard;
