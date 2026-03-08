import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/contexts/AppContext';
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Circle, CheckCircle2 } from 'lucide-react';
import { STATUS_COLORS, STATUS_LABELS, WorkflowStatus, ContentWithRelations } from '@/data/types';
import { platformIcon } from '@/components/content/PlatformIcons';
import { cn } from '@/lib/utils';
import { useClientFromUrl } from '@/hooks/useClientFromUrl';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, isPast, isToday as isTodayFn2 } from 'date-fns';
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

const DAYS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

interface CalTask {
  id: string;
  text: string;
  done: boolean;
  due_date: string | null;
  assigned_to: string | null;
  created_by: string;
}

const DraggableContent = ({ content, onClick }: { content: ContentWithRelations; onClick: () => void }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: content.id,
    data: { content },
  });

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
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

const DroppableDay = ({ dateStr, day, isToday: todayFlag, children }: {
  dateStr: string;
  day: number;
  isToday: boolean;
  children: React.ReactNode;
}) => {
  const { isOver, setNodeRef } = useDroppable({ id: dateStr });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[100px] p-2 border-r border-border last:border-r-0 transition-colors",
        isOver && "ring-2 ring-inset"
      )}
      style={{
        backgroundColor: isOver ? 'var(--client-50, hsl(var(--primary) / 0.1))' : undefined,
        ...(isOver ? { ringColor: 'var(--client-300)' } : {}),
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span
          className={cn("text-sm font-medium", todayFlag ? "w-7 h-7 rounded-full flex items-center justify-center" : "text-foreground")}
          style={todayFlag ? { backgroundColor: 'var(--client-500, hsl(var(--primary)))', color: 'var(--client-50, hsl(var(--primary-foreground)))' } : undefined}
        >
          {day}
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

const CalendarPage = () => {
  useClientFromUrl();
  const { projectContents, setSelectedContent, updateContentDate, selectedProject } = useApp();
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeContent, setActiveContent] = useState<ContentWithRelations | null>(null);
  const [tasks, setTasks] = useState<CalTask[]>([]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Fetch tasks for current project
  useEffect(() => {
    if (!selectedProject || !user) { setTasks([]); return; }
    const fetchTasks = async () => {
      const { data } = await supabase
        .from('project_tasks')
        .select('id, text, done, due_date, assigned_to, created_by')
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

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  let startDay = firstDay.getDay() - 1;
  if (startDay < 0) startDay = 6;

  const daysInMonth = lastDay.getDate();
  const totalCells = Math.ceil((startDay + daysInMonth) / 7) * 7;

  const cells: (number | null)[] = [];
  for (let i = 0; i < totalCells; i++) {
    const day = i - startDay + 1;
    cells.push(day >= 1 && day <= daysInMonth ? day : null);
  }

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  const getDateStr = (day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const getContentsForDay = (day: number) =>
    projectContents.filter(c => c.publish_date === getDateStr(day));

  const getTasksForDay = (day: number) =>
    tasks.filter(t => t.due_date === getDateStr(day));

  const undatedTasks = tasks.filter(t => !t.due_date);

  const today = new Date();
  const isTodayFn = (day: number) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

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

  const getDueDateStyle = (due_date: string | null, done: boolean) => {
    if (!due_date || done) return 'text-muted-foreground';
    const date = new Date(due_date + 'T00:00:00');
    if (isTodayFn2(date)) return 'text-amber-500';
    if (isPast(date)) return 'text-destructive';
    return 'text-muted-foreground';
  };

  return (
    <>
      <TopBar title="Calendário" subtitle="Planejamento mensal de conteúdos" />
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ backgroundColor: 'var(--client-50, hsl(var(--secondary)))' }}
          >
            <ChevronLeft size={18} style={{ color: 'var(--client-600, hsl(var(--muted-foreground)))' }} />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 text-xs font-medium rounded-md transition-colors"
            style={{ backgroundColor: 'var(--client-100, hsl(var(--secondary)))', color: 'var(--client-700, hsl(var(--foreground)))' }}
          >
            Hoje
          </button>
          <button
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ backgroundColor: 'var(--client-50, hsl(var(--secondary)))' }}
          >
            <ChevronRight size={18} style={{ color: 'var(--client-600, hsl(var(--muted-foreground)))' }} />
          </button>
          <span className="text-lg font-semibold text-foreground capitalize">{monthName}</span>
        </div>

        <div className="flex gap-6">
          {/* Sidebar: undated tasks */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Circle size={14} className="text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Sem data</h3>
              </div>
              {undatedTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma tarefa sem data.</p>
              ) : (
                <div className="space-y-1">
                  {undatedTasks.map(t => (
                    <div
                      key={t.id}
                      className="flex items-start gap-2 py-1.5 px-1 rounded-md hover:bg-secondary/50 transition-colors"
                    >
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
            </div>
          </div>

          {/* Calendar */}
          <div className="flex-1 min-w-0">
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <div className="border border-border rounded-xl overflow-hidden bg-card">
                <div className="grid grid-cols-7 border-b border-border">
                  {DAYS.map(d => (
                    <div key={d} className="py-2.5 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">{d}</div>
                  ))}
                </div>

                {weeks.map((week, wi) => (
                  <div key={wi} className="grid grid-cols-7 border-b border-border last:border-b-0">
                    {week.map((day, di) => {
                      if (!day) {
                        return <div key={di} className="min-h-[100px] p-2 border-r border-border last:border-r-0 bg-secondary/30" />;
                      }
                      const dayContents = getContentsForDay(day);
                      const dayTasks = getTasksForDay(day);
                      const dateStr = getDateStr(day);
                      return (
                        <DroppableDay key={di} dateStr={dateStr} day={day} isToday={isTodayFn(day)}>
                          {dayContents.slice(0, 3).map(c => (
                            <DraggableContent key={c.id} content={c} onClick={() => setSelectedContent(c)} />
                          ))}
                          {dayContents.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">+{dayContents.length - 3} mais</span>
                          )}
                          {dayTasks.map(t => (
                            <div
                              key={t.id}
                              className="flex items-center gap-1 px-1 py-0.5 rounded text-[11px]"
                            >
                              <Checkbox
                                checked={t.done}
                                onCheckedChange={(checked) => toggleTask(t.id, !!checked)}
                                className="h-3 w-3 flex-shrink-0"
                              />
                              <span className={cn(
                                "truncate",
                                t.done ? "line-through text-muted-foreground" : "text-foreground"
                              )}>
                                {t.text}
                              </span>
                            </div>
                          ))}
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
