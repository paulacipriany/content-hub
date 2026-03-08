import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/contexts/AppContext';
import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Circle, Plus, CalendarDays, CalendarRange } from 'lucide-react';
import { STATUS_COLORS, WorkflowStatus, ContentWithRelations } from '@/data/types';
import { platformIcon } from '@/components/content/PlatformIcons';
import { cn } from '@/lib/utils';
import { useClientFromUrl } from '@/hooks/useClientFromUrl';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, isPast, isToday as isTodayDateFns, startOfWeek, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const DAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

interface CalTask {
  id: string;
  text: string;
  done: boolean;
  due_date: string | null;
  assigned_to: string | null;
  created_by: string;
  sort_order: number;
}

// --- Draggable content chip ---
const DraggableContent = ({ content, onClick }: { content: ContentWithRelations; onClick: () => void }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: content.id,
    data: { type: 'content', content },
  });
  return (
    <button
      ref={setNodeRef} {...listeners} {...attributes}
      onClick={onClick}
      className={cn(
        "w-full text-left px-1.5 py-1 rounded text-[11px] font-medium truncate flex items-center gap-1 hover:opacity-80 transition-opacity cursor-grab active:cursor-grabbing",
        STATUS_COLORS[content.status as WorkflowStatus],
        "text-primary-foreground",
        isDragging && "opacity-30"
      )}
    >
      {platformIcon(content.platform, 10)}
      <span className="truncate">{content.title}</span>
    </button>
  );
};

// --- Draggable task from sidebar ---
const DraggableTask = ({ task, onToggle }: { task: CalTask; onToggle: (id: string, done: boolean) => void }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: { type: 'task', task },
  });
  return (
    <div
      ref={setNodeRef} {...listeners} {...attributes}
      className={cn(
        "flex items-start gap-2 py-1.5 px-1 rounded-md hover:bg-secondary/50 transition-colors cursor-grab active:cursor-grabbing",
        isDragging && "opacity-30"
      )}
    >
      <Checkbox
        checked={task.done}
        onCheckedChange={(checked) => { onToggle(task.id, !!checked); }}
        onClick={(e) => e.stopPropagation()}
        className="mt-0.5 flex-shrink-0"
      />
      <span className={cn(
        "text-sm leading-snug",
        task.done ? "line-through text-muted-foreground" : "text-foreground"
      )}>
        {task.text}
      </span>
    </div>
  );
};

// --- Droppable day cell ---
const DroppableDay = ({ dateStr, dayLabel, isToday: todayFlag, tall, children }: {
  dateStr: string;
  dayLabel: React.ReactNode;
  isToday: boolean;
  tall?: boolean;
  children: React.ReactNode;
}) => {
  const { isOver, setNodeRef } = useDroppable({ id: dateStr });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "p-2 border-r border-border last:border-r-0 transition-colors",
        tall ? "min-h-[300px]" : "min-h-[100px]",
        isOver && "ring-2 ring-inset"
      )}
      style={{
        backgroundColor: isOver ? 'var(--client-50, hsl(var(--primary) / 0.1))' : undefined,
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span
          className={cn("text-sm font-medium", todayFlag ? "w-7 h-7 rounded-full flex items-center justify-center" : "text-foreground")}
          style={todayFlag ? { backgroundColor: 'var(--client-500, hsl(var(--primary)))', color: 'var(--client-50, hsl(var(--primary-foreground)))' } : undefined}
        >
          {dayLabel}
        </span>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
};

const ContentOverlay = ({ content }: { content: ContentWithRelations }) => (
  <div className={cn(
    "px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 shadow-lg w-40",
    STATUS_COLORS[content.status as WorkflowStatus],
    "text-primary-foreground"
  )}>
    {platformIcon(content.platform, 10)}
    <span className="truncate">{content.title}</span>
  </div>
);

// --- Editable task in calendar ---
const EditableCalTask = ({ task, onToggle, onUpdate }: {
  task: CalTask;
  onToggle: (id: string, done: boolean) => void;
  onUpdate: (id: string, text: string) => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(task.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const save = () => {
    setEditing(false);
    const trimmed = val.trim();
    if (trimmed && trimmed !== task.text) onUpdate(task.id, trimmed);
    else setVal(task.text);
  };

  return (
    <div className="flex items-center gap-1 px-1 py-0.5 rounded text-[11px] group/task">
      <Checkbox
        checked={task.done}
        onCheckedChange={(checked) => onToggle(task.id, !!checked)}
        className="h-3 w-3 flex-shrink-0"
      />
      {editing ? (
        <input
          ref={inputRef}
          value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={save}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setVal(task.text); setEditing(false); } }}
          className="flex-1 min-w-0 bg-transparent outline-none text-[11px] text-foreground border-b border-primary/40"
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          className={cn(
            "truncate cursor-text hover:underline decoration-dotted underline-offset-2",
            task.done ? "line-through text-muted-foreground" : "text-foreground"
          )}
        >
          {task.text}
        </span>
      )}
    </div>
  );
};

// === Main ===
const CalendarPage = () => {
  useClientFromUrl();
  const { projectContents, setSelectedContent, updateContentDate, selectedProject } = useApp();
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [activeContent, setActiveContent] = useState<ContentWithRelations | null>(null);
  const [tasks, setTasks] = useState<CalTask[]>([]);
  const [newTaskText, setNewTaskText] = useState('');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    if (!selectedProject || !user) { setTasks([]); return; }
    const fetchTasks = async () => {
      const { data } = await supabase
        .from('project_tasks')
        .select('id, text, done, due_date, assigned_to, created_by, sort_order')
        .eq('project_id', selectedProject.id)
        .order('sort_order');
      setTasks((data as CalTask[]) ?? []);
    };
    fetchTasks();
  }, [selectedProject, user]);

  const toggleTask = async (id: string, done: boolean) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done } : t));
    await supabase.from('project_tasks').update({ done }).eq('id', id);
  };

  const updateTaskText = async (id: string, text: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, text } : t));
    await supabase.from('project_tasks').update({ text } as any).eq('id', id);
  };

  const addTask = async () => {
    const trimmed = newTaskText.trim();
    if (!trimmed || !user || !selectedProject) return;
    const nextOrder = tasks.length > 0 ? Math.max(...tasks.map(t => t.sort_order)) + 1 : 0;
    const { data } = await supabase
      .from('project_tasks')
      .insert({
        project_id: selectedProject.id,
        text: trimmed,
        created_by: user.id,
        sort_order: nextOrder,
      } as any)
      .select('id, text, done, due_date, assigned_to, created_by, sort_order')
      .single();
    if (data) setTasks(prev => [...prev, data as CalTask]);
    setNewTaskText('');
  };

  // --- Date helpers ---
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const today = new Date();
  const isDateToday = (d: Date) => d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  const fmtDateStr = (d: Date) => format(d, 'yyyy-MM-dd');

  const getContentsForDate = (dateStr: string) => projectContents.filter(c => c.publish_date === dateStr);
  const getTasksForDate = (dateStr: string) => tasks.filter(t => t.due_date === dateStr);
  const undatedTasks = tasks.filter(t => !t.due_date);

  // --- Week view data ---
  const getWeekDays = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  // --- Month view data ---
  const getMonthWeeks = () => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let startDay = firstDay.getDay();
    if (startDay < 0) startDay = 6;
    const daysInMonth = lastDay.getDate();
    const totalCells = Math.ceil((startDay + daysInMonth) / 7) * 7;
    const cells: (Date | null)[] = [];
    for (let i = 0; i < totalCells; i++) {
      const day = i - startDay + 1;
      cells.push(day >= 1 && day <= daysInMonth ? new Date(year, month, day) : null);
    }
    const weeks: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
  };

  // --- Navigation ---
  const goBack = () => {
    if (viewMode === 'week') setCurrentDate(prev => addDays(prev, -7));
    else setCurrentDate(new Date(year, month - 1, 1));
  };
  const goForward = () => {
    if (viewMode === 'week') setCurrentDate(prev => addDays(prev, 7));
    else setCurrentDate(new Date(year, month + 1, 1));
  };
  const goToday = () => setCurrentDate(new Date());

  const headerLabel = viewMode === 'week'
    ? (() => {
        const days = getWeekDays();
        const s = days[0], e = days[6];
        if (s.getMonth() === e.getMonth()) return `${format(s, 'd')} – ${format(e, "d 'de' MMMM yyyy", { locale: ptBR })}`;
        return `${format(s, "d MMM", { locale: ptBR })} – ${format(e, "d MMM yyyy", { locale: ptBR })}`;
      })()
    : currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // --- DnD ---
  const handleDragStart = (event: DragStartEvent) => {
    setActiveContent(event.active.data.current?.content ?? null);
  };
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveContent(null);
    if (!over) return;
    const contentId = active.id as string;
    const newDate = over.id as string;
    const content = projectContents.find(c => c.id === contentId);
    if (!content || content.publish_date === newDate) return;
    updateContentDate(contentId, newDate);
  };

  // --- Render day cell contents ---
  const renderDayItems = (dateStr: string) => {
    const dayContents = getContentsForDate(dateStr);
    const dayTasks = getTasksForDate(dateStr);
    return (
      <>
        {dayContents.slice(0, viewMode === 'week' ? 10 : 3).map(c => (
          <DraggableContent key={c.id} content={c} onClick={() => setSelectedContent(c)} />
        ))}
        {viewMode === 'month' && dayContents.length > 3 && (
          <span className="text-[10px] text-muted-foreground">+{dayContents.length - 3} mais</span>
        )}
        {dayTasks.map(t => (
          <EditableCalTask key={t.id} task={t} onToggle={toggleTask} onUpdate={updateTaskText} />
        ))}
      </>
    );
  };

  return (
    <>
      <TopBar title="Calendário" subtitle="Planejamento mensal de conteúdos" />
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={goBack}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ backgroundColor: 'var(--client-50, hsl(var(--secondary)))' }}
          >
            <ChevronLeft size={18} style={{ color: 'var(--client-600, hsl(var(--muted-foreground)))' }} />
          </button>
          <button onClick={goToday}
            className="px-3 py-1 text-xs font-medium rounded-md transition-colors"
            style={{ backgroundColor: 'var(--client-100, hsl(var(--secondary)))', color: 'var(--client-700, hsl(var(--foreground)))' }}
          >
            Hoje
          </button>
          <button onClick={goForward}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ backgroundColor: 'var(--client-50, hsl(var(--secondary)))' }}
          >
            <ChevronRight size={18} style={{ color: 'var(--client-600, hsl(var(--muted-foreground)))' }} />
          </button>
          <span className="text-lg font-semibold text-foreground capitalize">{headerLabel}</span>

          {/* View mode toggle */}
          <div className="ml-auto flex items-center bg-secondary rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => setViewMode('week')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                viewMode === 'week' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <CalendarRange size={14} />
              Semana
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                viewMode === 'month' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <CalendarDays size={14} />
              Mês
            </button>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Sidebar: undated tasks */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Circle size={14} className="text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Sem data</h3>
                <span className="ml-auto text-xs text-muted-foreground">{undatedTasks.length}</span>
              </div>

              {undatedTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground mb-3">Nenhuma tarefa sem data.</p>
              ) : (
                <div className="space-y-1 mb-3">
                  {undatedTasks.map(t => (
                    <div key={t.id} className="flex items-start gap-2 py-1.5 px-1 rounded-md hover:bg-secondary/50 transition-colors">
                      <Checkbox
                        checked={t.done}
                        onCheckedChange={(checked) => toggleTask(t.id, !!checked)}
                        className="mt-0.5 flex-shrink-0"
                      />
                      <span className={cn(
                        "text-sm leading-snug",
                        t.done ? "line-through text-muted-foreground" : "text-foreground"
                      )}>
                        {t.text}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new task */}
              <form onSubmit={e => { e.preventDefault(); addTask(); }} className="flex gap-1.5">
                <Input
                  value={newTaskText}
                  onChange={e => setNewTaskText(e.target.value)}
                  placeholder="Nova tarefa..."
                  className="h-7 text-xs"
                />
                <Button type="submit" size="sm" variant="outline" className="h-7 px-2 flex-shrink-0" disabled={!newTaskText.trim()}>
                  <Plus size={12} />
                </Button>
              </form>
            </div>
          </div>

          {/* Calendar grid */}
          <div className="flex-1 min-w-0">
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <div className="border border-border rounded-xl overflow-hidden bg-card">
                {/* Day headers */}
                <div className="grid grid-cols-7 border-b border-border">
                  {viewMode === 'week'
                    ? getWeekDays().map((d, i) => (
                        <div key={i} className="py-2.5 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {DAYS[i]} <span className="text-foreground">{d.getDate()}</span>
                        </div>
                      ))
                    : DAYS.map(d => (
                        <div key={d} className="py-2.5 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">{d}</div>
                      ))
                  }
                </div>

                {/* Week view */}
                {viewMode === 'week' && (
                  <div className="grid grid-cols-7">
                    {getWeekDays().map((d, i) => {
                      const dateStr = fmtDateStr(d);
                      return (
                        <DroppableDay key={i} dateStr={dateStr} dayLabel="" isToday={isDateToday(d)} tall>
                          {renderDayItems(dateStr)}
                        </DroppableDay>
                      );
                    })}
                  </div>
                )}

                {/* Month view */}
                {viewMode === 'month' && getMonthWeeks().map((week, wi) => (
                  <div key={wi} className="grid grid-cols-7 border-b border-border last:border-b-0">
                    {week.map((d, di) => {
                      if (!d) return <div key={di} className="min-h-[100px] p-2 border-r border-border last:border-r-0 bg-secondary/30" />;
                      const dateStr = fmtDateStr(d);
                      return (
                        <DroppableDay key={di} dateStr={dateStr} dayLabel={d.getDate()} isToday={isDateToday(d)}>
                          {renderDayItems(dateStr)}
                        </DroppableDay>
                      );
                    })}
                  </div>
                ))}
              </div>

              <DragOverlay>
                {activeContent && <ContentOverlay content={activeContent} />}
              </DragOverlay>
            </DndContext>
          </div>
        </div>
      </div>
    </>
  );
};

export default CalendarPage;
