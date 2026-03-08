import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Trash2, Bell, CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Reminder {
  id: string;
  text: string;
  done: boolean;
  due_date: string | null;
}

const RemindersCard = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Reminder[]>([]);
  const [newText, setNewText] = useState('');
  const [newDate, setNewDate] = useState<Date | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchItems();
  }, [user]);

  const fetchItems = async () => {
    const { data } = await supabase
      .from('reminders')
      .select('id, text, done, due_date')
      .eq('user_id', user!.id)
      .order('created_at');
    setItems((data as Reminder[]) ?? []);
    setLoading(false);
  };

  const addItem = async () => {
    const trimmed = newText.trim();
    if (!trimmed || !user) return;
    const { data } = await supabase
      .from('reminders')
      .insert({
        user_id: user.id,
        text: trimmed,
        due_date: newDate ? format(newDate, 'yyyy-MM-dd') : null,
      } as any)
      .select('id, text, done, due_date')
      .single();
    if (data) setItems(prev => [...prev, data as Reminder]);
    setNewText('');
    setNewDate(undefined);
  };

  const toggleItem = async (id: string, done: boolean) => {
    setItems(prev => prev.map(r => r.id === id ? { ...r, done } : r));
    await supabase.from('reminders').update({ done } as any).eq('id', id);
  };

  const deleteItem = async (id: string) => {
    setItems(prev => prev.filter(r => r.id !== id));
    await supabase.from('reminders').delete().eq('id', id);
  };

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
        <Bell size={16} className="text-amber-500" />
        <h2 className="text-sm font-semibold text-foreground">Avisos e Lembretes</h2>
        {items.filter(i => !i.done).length > 0 && (
          <span className="ml-auto text-xs font-semibold bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded-full">
            {items.filter(i => !i.done).length}
          </span>
        )}
      </div>

      <div className="space-y-1.5 mb-3 max-h-64 overflow-y-auto">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum lembrete ainda.</p>
        ) : (
          items.map(r => (
            <div
              key={r.id}
              className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-secondary/50 transition-colors group"
            >
              <Checkbox
                checked={r.done}
                onCheckedChange={(checked) => toggleItem(r.id, !!checked)}
                className="flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <span className={cn(
                  "text-sm block truncate transition-colors",
                  r.done ? "line-through text-muted-foreground" : "text-foreground"
                )}>
                  {r.text}
                </span>
                {r.due_date && (
                  <span className={cn("text-[10px] font-medium", getDueDateStyle(r.due_date, r.done))}>
                    {format(new Date(r.due_date + 'T00:00:00'), "dd MMM", { locale: ptBR })}
                  </span>
                )}
              </div>
              <button
                onClick={() => deleteItem(r.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all flex-shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); addItem(); }}
        className="flex gap-2"
      >
        <Input
          value={newText}
          onChange={e => setNewText(e.target.value)}
          placeholder="Novo lembrete..."
          className="h-8 text-sm"
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={cn("h-8 px-2 flex-shrink-0", newDate && "text-primary")}
              title="Definir data"
            >
              <CalendarIcon size={14} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={newDate}
              onSelect={setNewDate}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
        <Button type="submit" size="sm" variant="outline" className="h-8 px-2.5 flex-shrink-0" disabled={!newText.trim()}>
          <Plus size={14} />
        </Button>
      </form>
      {newDate && (
        <div className="flex items-center gap-1 mt-1.5">
          <span className="text-[10px] text-muted-foreground">
            Data: {format(newDate, "dd 'de' MMM, yyyy", { locale: ptBR })}
          </span>
          <button onClick={() => setNewDate(undefined)} className="text-muted-foreground hover:text-destructive">
            <X size={10} />
          </button>
        </div>
      )}
    </div>
  );
};

export default RemindersCard;
