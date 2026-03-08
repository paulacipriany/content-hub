import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/contexts/AppContext';
import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, CalendarDays, CalendarRange, GripVertical, LayoutGrid, CheckSquare, Eye } from 'lucide-react';
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

const DAYS_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

interface CalTask {
  id: string;
  text: string;
  done: boolean;
  due_date: string | null;
  assigned_to: string | null;
  created_by: string;
  sort_order: number;
}

// --- Draggable content chip (Google-style event pill) ---
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
        "w-full text-left px-2 py-[3px] rounded-[4px] text-[11px] font-medium truncate flex items-center gap-1.5",
        "hover:brightness-95 transition-all cursor-grab active:cursor-grabbing",
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
        "flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-muted/60 transition-colors cursor-grab active:cursor-grabbing group",
        isDragging && "opacity-30"
      )}
    >
      <GripVertical size={12} className="text-muted-foreground/0 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
      <Checkbox
        checked={task.done}
        onCheckedChange={(checked) => { onToggle(task.id, !!checked); }}
        onClick={(e) => e.stopPropagation()}
        className="h-3.5 w-3.5 flex-shrink-0 rounded-sm"
      />
      <span className={cn(
        "text-[13px] leading-snug truncate",
        task.done ? "line-through text-muted-foreground" : "text-foreground"
      )}>
        {task.text}
      </span>
    </div>
  );
};

// --- Droppable day cell (Google Calendar style) ---
const DroppableDay = ({ dateStr, dayNum, dayName, isToday: todayFlag, isCurrentMonth, tall, children }: {
  dateStr: string;
  dayNum?: number;
  dayName?: string;
  isToday: boolean;
  isCurrentMonth?: boolean;
  tall?: boolean;
  children: React.ReactNode;
}) => {
  const { isOver, setNodeRef } = useDroppable({ id: dateStr });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "border-b border-r border-border/50 last:border-r-0 transition-colors relative",
        tall ? "min-h-[calc(100vh-280px)]" : "min-h-[120px]",
        isOver && "bg-primary/5",
        isCurrentMonth === false && "bg-muted/20"
      )}
    >
      {/* Day header area */}
      <div className="flex flex-col items-center pt-2 pb-1">
        {dayName && (
          <span className={cn(
            "text-[11px] font-medium uppercase tracking-wide mb-0.5",
            todayFlag ? "text-primary" : "text-muted-foreground"
          )}>
            {dayName}
          </span>
        )}
        {dayNum !== undefined && (
          <span
            className={cn(
              "text-sm leading-none flex items-center justify-center transition-colors",
              todayFlag
                ? "w-7 h-7 rounded-full bg-primary text-primary-foreground font-semibold"
                : isCurrentMonth === false
                  ? "text-muted-foreground/50 font-normal"
                  : "text-foreground font-medium hover:bg-muted rounded-full w-7 h-7"
            )}
          >
            {dayNum}
          </span>
        )}
      </div>
      {/* Events area */}
      <div className="px-1 pb-1 space-y-[2px]">{children}</div>
    </div>
  );
};

const ContentOverlay = ({ content }: { content: ContentWithRelations }) => (
  <div className={cn(
    "px-2.5 py-1 rounded-[4px] text-[11px] font-medium flex items-center gap-1.5 shadow-xl w-44",
    STATUS_COLORS[content.status as WorkflowStatus],
    "text-primary-foreground"
  )}>
    {platformIcon(content.platform, 10)}
    <span className="truncate">{content.title}</span>
  </div>
);

// --- Editable task in calendar (Google-style task chip) ---
const EditableCalTask = ({ task, onToggle, onUpdate }: {
  task: CalTask;
  onToggle: (id: string, done: boolean) => void;
  onUpdate: (id: string, text: string) => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(task.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const isOverdue = !task.done && task.due_date && isPast(new Date(task.due_date + 'T23:59:59')) && !isTodayDateFns(new Date(task.due_date));

  const save = () => {
    setEditing(false);
    const trimmed = val.trim();
    if (trimmed && trimmed !== task.text) onUpdate(task.id, trimmed);
    else setVal(task.text);
  };

  return (
    <div className={cn(
      "flex items-center gap-1 px-1.5 py-[2px] rounded-[4px] text-[11px] group/task border-l-2 transition-colors",
      isOverdue ? "border-l-destructive bg-destructive/5" : "border-l-muted-foreground/30 hover:bg-muted/40"
    )}>
      <Checkbox
        checked={task.done}
        onCheckedChange={(checked) => onToggle(task.id, !!checked)}
        className={cn("h-3 w-3 flex-shrink-0 rounded-sm", isOverdue && "border-destructive")}
      />
      {editing ? (
        <input
          ref={inputRef}
          value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={save}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setVal(task.text); setEditing(false); } }}
          className="flex-1 min-w-0 bg-transparent outline-none text-[11px] text-foreground"
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          className={cn(
            "truncate cursor-text",
            task.done ? "line-through text-muted-foreground" : isOverdue ? "text-destructive" : "text-foreground"
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
  const [activeTask, setActiveTask] = useState<CalTask | null>(null);
  const [tasks, setTasks] = useState<CalTask[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [showContents, setShowContents] = useState(true);
  const [showTasks, setShowTasks] = useState(true);

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

  const getWeekDays = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

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
        if (s.getMonth() === e.getMonth()) return format(e, "MMMM yyyy", { locale: ptBR });
        return `${format(s, "MMM", { locale: ptBR })} – ${format(e, "MMM yyyy", { locale: ptBR })}`;
      })()
    : format(currentDate, "MMMM yyyy", { locale: ptBR });

  // --- DnD ---
  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === 'content') setActiveContent(data.content);
    else if (data?.type === 'task') setActiveTask(data.task);
  };
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveContent(null);
    setActiveTask(null);
    if (!over) return;
    const data = active.data.current;
    const newDate = over.id as string;

    if (data?.type === 'content') {
      const content = projectContents.find(c => c.id === active.id);
      if (!content || content.publish_date === newDate) return;
      updateContentDate(active.id as string, newDate);
    } else if (data?.type === 'task') {
      const taskId = (active.id as string).replace('task-', '');
      const task = tasks.find(t => t.id === taskId);
      if (!task || task.due_date === newDate) return;
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, due_date: newDate } : t));
      await supabase.from('project_tasks').update({ due_date: newDate } as any).eq('id', taskId);
    }
  };

  // --- Render day cell contents ---
  const renderDayItems = (dateStr: string) => {
    const dayContents = showContents ? getContentsForDate(dateStr) : [];
    const dayTasks = showTasks ? getTasksForDate(dateStr) : [];
    return (
      <>
        {dayContents.slice(0, viewMode === 'week' ? 10 : 3).map(c => (
          <DraggableContent key={c.id} content={c} onClick={() => setSelectedContent(c)} />
        ))}
        {viewMode === 'month' && dayContents.length > 3 && (
          <span className="text-[10px] text-muted-foreground pl-1">+{dayContents.length - 3} mais</span>
        )}
        {dayTasks.map(t => (
          <EditableCalTask key={t.id} task={t} onToggle={toggleTask} onUpdate={updateTaskText} />
        ))}
      </>
    );
  };

  return (
    <>
      <TopBar title="Calendário" subtitle="Planejamento de conteúdos" />
      <div className="flex h-[calc(100vh-130px)]">
        {/* Sidebar: undated tasks — Google Calendar style side panel */}
        <div className="w-60 flex-shrink-0 border-r border-border/50 bg-card overflow-y-auto">
          <div className="p-3">
            {/* Filters */}
            <div className="mb-4 space-y-1">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Filtros</h3>
              <button
                onClick={() => setShowContents(prev => !prev)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] font-medium transition-colors",
                  showContents ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                )}
              >
                <LayoutGrid size={13} />
                Conteúdos
                <Eye size={12} className={cn("ml-auto", !showContents && "opacity-30")} />
              </button>
              <button
                onClick={() => setShowTasks(prev => !prev)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] font-medium transition-colors",
                  showTasks ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                )}
              >
                <CheckSquare size={13} />
                Tarefas
                <Eye size={12} className={cn("ml-auto", !showTasks && "opacity-30")} />
              </button>
            </div>

            <div className="border-t border-border/50 pt-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sem data</h3>
              <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 font-medium">
                {undatedTasks.length}
              </span>
            </div>

            {undatedTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 py-4 text-center">Nenhuma tarefa</p>
            ) : (
              <div className="space-y-0.5 mb-3">
                {undatedTasks.map(t => (
                  <DraggableTask key={t.id} task={t} onToggle={toggleTask} />
                ))}
              </div>
            )}

            {/* Add new task — minimal input */}
            <form onSubmit={e => { e.preventDefault(); addTask(); }} className="flex items-center gap-1.5 mt-2">
              <Input
                value={newTaskText}
                onChange={e => setNewTaskText(e.target.value)}
                placeholder="Adicionar tarefa..."
                className="h-8 text-xs border-dashed bg-transparent"
              />
              <Button
                type="submit"
                size="icon"
                variant="ghost"
                className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-primary"
                disabled={!newTaskText.trim()}
              >
                <Plus size={14} />
              </Button>
            </form>
            </div>
          </div>
        </div>

        {/* Main calendar area */}
        <div className="flex-1 min-w-0 flex flex-col bg-background">
          {/* Google Calendar-style toolbar */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/50">
            <button
              onClick={goToday}
              className="px-4 py-1.5 text-sm font-medium rounded-md border border-border hover:bg-muted transition-colors text-foreground"
            >
              Hoje
            </button>
            <button onClick={goBack} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
              <ChevronLeft size={18} className="text-muted-foreground" />
            </button>
            <button onClick={goForward} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
              <ChevronRight size={18} className="text-muted-foreground" />
            </button>
            <h2 className="text-[22px] font-normal text-foreground capitalize ml-2">{headerLabel}</h2>

            {/* View mode toggle — pill style */}
            <div className="ml-auto flex items-center border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('week')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                  viewMode === 'week'
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <CalendarRange size={13} />
                Semana
              </button>
              <div className="w-px h-5 bg-border" />
              <button
                onClick={() => setViewMode('month')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                  viewMode === 'month'
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <CalendarDays size={13} />
                Mês
              </button>
            </div>
          </div>

          {/* Calendar grid */}
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex-1 overflow-y-auto">
              {/* Day name headers */}
              <div className="grid grid-cols-7 border-b border-border/50 sticky top-0 bg-background z-10">
                {viewMode === 'week'
                  ? getWeekDays().map((d, i) => (
                      <div key={i} className="flex flex-col items-center py-2">
                        <span className={cn(
                          "text-[11px] font-medium uppercase tracking-wide",
                          isDateToday(d) ? "text-primary" : "text-muted-foreground"
                        )}>
                          {DAYS_SHORT[d.getDay()]}
                        </span>
                        <span
                          className={cn(
                            "text-[26px] leading-tight font-light mt-0.5 w-11 h-11 flex items-center justify-center rounded-full transition-colors",
                            isDateToday(d)
                              ? "bg-primary text-primary-foreground font-normal"
                              : "text-foreground hover:bg-muted"
                          )}
                        >
                          {d.getDate()}
                        </span>
                      </div>
                    ))
                  : DAYS_SHORT.map(d => (
                      <div key={d} className="py-2 text-center text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                        {d}
                      </div>
                    ))
                }
              </div>

              {/* Week view */}
              {viewMode === 'week' && (
                <div className="grid grid-cols-7">
                  {getWeekDays().map((d, i) => {
                    const dateStr = fmtDateStr(d);
                    return (
                      <DroppableDay key={i} dateStr={dateStr} isToday={isDateToday(d)} isCurrentMonth tall>
                        {renderDayItems(dateStr)}
                      </DroppableDay>
                    );
                  })}
                </div>
              )}

              {/* Month view */}
              {viewMode === 'month' && getMonthWeeks().map((week, wi) => (
                <div key={wi} className="grid grid-cols-7">
                  {week.map((d, di) => {
                    if (!d) return (
                      <div key={di} className="min-h-[120px] border-b border-r border-border/50 last:border-r-0 bg-muted/10" />
                    );
                    const dateStr = fmtDateStr(d);
                    return (
                      <DroppableDay
                        key={di}
                        dateStr={dateStr}
                        dayNum={d.getDate()}
                        isToday={isDateToday(d)}
                        isCurrentMonth={d.getMonth() === month}
                      >
                        {renderDayItems(dateStr)}
                      </DroppableDay>
                    );
                  })}
                </div>
              ))}
            </div>

            <DragOverlay>
              {activeContent && <ContentOverlay content={activeContent} />}
              {activeTask && (
                <div className="px-2.5 py-1 rounded-[4px] text-[11px] font-medium bg-card border border-border shadow-xl w-48 truncate">
                  {activeTask.text}
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>
      </div>
    </>
  );
};

export default CalendarPage;
