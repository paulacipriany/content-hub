import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/contexts/AppContext';
import { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, CalendarDays, CalendarRange, GripVertical, LayoutGrid, CheckSquare, Eye, EyeOff, PanelLeftClose, PanelLeftOpen, Calendar as CalIcon, User, Star, Trash2, PartyPopper, Copy, Download } from 'lucide-react';
import { STATUS_COLORS, STATUS_LABELS, CONTENT_TYPE_LABELS, PLATFORM_LABELS, WorkflowStatus, ContentType, Platform, ContentWithRelations } from '@/data/types';
import { platformIcon } from '@/components/content/PlatformIcons';
import { cn } from '@/lib/utils';
import { useClientFromUrl } from '@/hooks/useClientFromUrl';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, isPast, isToday as isTodayDateFns, startOfWeek, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import JSZip from 'jszip';
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
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import PostPreview from '@/components/content/PostPreview';
import WeeklyContentCard from '@/components/calendar/WeeklyContentCard';
import { getCommemorativeDatesForDay, COMMEMORATIVE_DATES } from '@/data/commemorativeDates';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';

const DAYS_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

// Time slots for hourly grid (6am to 11pm)
const TIME_SLOTS = Array.from({ length: 18 }, (_, i) => i + 6); // 6-23

interface CalTask {
  id: string;
  text: string;
  done: boolean;
  due_date: string | null;
  assigned_to: string | null;
  created_by: string;
  sort_order: number;
}

const STATUS_CSS_VAR: Record<string, string> = {
  'idea': '--status-idea',
  'idea-bank': '--status-idea',
  'production': '--status-production',
  'review': '--status-review',
  'approval-client': '--status-approval-client',
  'scheduled': '--status-scheduled',
  'programmed': '--status-programmed',
  'published': '--status-published',
};

// --- Expanded content card for calendar (like reference image) ---
const DraggableContent = ({ content, onClick, disabled, platformProfiles }: { content: ContentWithRelations; onClick: () => void; disabled?: boolean; platformProfiles?: Map<string, string> }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: content.id,
    data: { type: 'content', content },
    disabled,
  });
  const platforms: string[] = Array.isArray(content.platform) ? content.platform : [content.platform];
  const firstPlatform = platforms[0];
  const dotColor = `hsl(var(${STATUS_CSS_VAR[content.status] ?? '--status-idea'}))`;
  const contentTypeLabel = CONTENT_TYPE_LABELS[content.content_type as ContentType] || content.content_type;
  
  // Get platform handle from profiles or derive from project name
  const handle = platformProfiles?.get(firstPlatform) || 
    (content.project?.name ? content.project.name.toLowerCase().replace(/\s+/g, '.').slice(0, 15) : '');

  return (
    <div
      ref={setNodeRef} {...listeners} {...attributes}
      onClick={onClick}
      className={cn(
        "w-full text-left py-[3px] px-1.5 rounded-sm",
        "hover:bg-muted/60 transition-all overflow-hidden min-w-0",
        disabled ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-30"
      )}
      title={content.title}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
        <span className="shrink-0">{platformIcon([firstPlatform] as any, 14)}</span>
        <span className="text-[12px] font-semibold text-foreground whitespace-nowrap">{contentTypeLabel}</span>
        {handle && (
          <span className="text-[11px] text-muted-foreground truncate">@{handle}</span>
        )}
      </div>
    </div>
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

// --- Droppable day cell ---
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
        "border-b border-r border-border/40 last:border-r-0 transition-colors relative overflow-hidden",
        tall ? "min-h-[calc(100vh-300px)]" : "min-h-[140px]",
        isOver && "bg-primary/5",
        isCurrentMonth === false && "bg-muted/15"
      )}
    >
      <div className="flex flex-col items-end pt-1.5 pr-2 pb-1">
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
                  ? "text-muted-foreground/40 font-normal"
                  : "text-foreground font-medium"
            )}
          >
            {dayNum}
          </span>
        )}
      </div>
      <div className="px-1.5 pb-1.5 space-y-0.5 overflow-y-auto max-h-[calc(100%-40px)] min-w-0">{children}</div>
    </div>
  );
};

// --- Droppable fixed top cell (for week view) ---
const DroppableFixedCell = ({ dateStr, children }: { dateStr: string; children: React.ReactNode }) => {
  const { isOver, setNodeRef } = useDroppable({ id: dateStr });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "border-r border-border/40 last:border-r-0 p-1.5 min-h-[60px] min-w-0 overflow-hidden",
        isOver && "bg-primary/5"
      )}
    >
      {children}
    </div>
  );
};

// --- Droppable hour cell (for week view time grid) ---
const DroppableHourCell = ({ dateStr, hour, children }: { dateStr: string; hour: number; children: React.ReactNode }) => {
  const { isOver, setNodeRef } = useDroppable({ id: `${dateStr}-${hour}` });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "border-r border-border/40 last:border-r-0 p-1 min-h-[60px] relative min-w-0 overflow-hidden",
        isOver && "bg-primary/5"
      )}
    >
      {children}
    </div>
  );
};

const ContentOverlay = ({ content }: { content: ContentWithRelations }) => (
  <div className="p-2 rounded-lg bg-card border border-border shadow-xl w-48">
    <div className="flex items-center gap-1.5 mb-1">
      {platformIcon(content.platform, 12)}
      <span className="text-[12px] font-semibold text-foreground truncate">{content.title}</span>
    </div>
    <div className="flex items-center gap-1.5">
      <span className={cn("w-2 h-2 rounded-full", STATUS_COLORS[content.status as WorkflowStatus])} />
      <span className="text-[10px] text-muted-foreground">{STATUS_LABELS[content.status as WorkflowStatus]}</span>
    </div>
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

  const isOverdue = !task.done && task.due_date && isPast(new Date(task.due_date + 'T23:59:59')) && !isTodayDateFns(new Date(task.due_date));

  const save = () => {
    setEditing(false);
    const trimmed = val.trim();
    if (trimmed && trimmed !== task.text) onUpdate(task.id, trimmed);
    else setVal(task.text);
  };

  return (
    <div className={cn(
      "flex items-center gap-1 px-1.5 py-[2px] rounded-[4px] text-[11px] group/task border-l-2 transition-colors min-w-0 overflow-hidden",
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
            "truncate cursor-text min-w-0",
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
  const { user, role } = useAuth();
  const isClient = role === 'client';
  
  const clientAllowedStatuses: WorkflowStatus[] = ['approval-client', 'review', 'scheduled', 'programmed', 'published'];
  const displayContents = useMemo(() => {
    if (!isClient) return projectContents;
    return projectContents.filter(c => clientAllowedStatuses.includes(c.status as WorkflowStatus));
  }, [projectContents, isClient]);
  const [previewContent, setPreviewContent] = useState<ContentWithRelations | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [activeContent, setActiveContent] = useState<ContentWithRelations | null>(null);
  const [activeTask, setActiveTask] = useState<CalTask | null>(null);
  const [tasks, setTasks] = useState<CalTask[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [showContents, setShowContents] = useState(true);
  const [showTasks, setShowTasks] = useState(true);

  const [showDates, setShowDates] = useState(true);
  const [customDates, setCustomDates] = useState<{ id: string; date: string; title: string }[]>([]);
  const [addDateDialogOpen, setAddDateDialogOpen] = useState(false);
  const [newDateTitle, setNewDateTitle] = useState('');
  const [newDateValue, setNewDateValue] = useState<Date | undefined>(undefined);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importMonth, setImportMonth] = useState(new Date().getMonth());
  const { toast } = useToast();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Fetch platform profiles for usernames
  const [platformProfiles, setPlatformProfiles] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    if (!selectedProject) { setPlatformProfiles(new Map()); return; }
    supabase
      .from('project_platform_profiles')
      .select('platform, username')
      .eq('project_id', selectedProject.id)
      .then(({ data }) => {
        const map = new Map<string, string>();
        (data ?? []).forEach((p: any) => { if (p.username) map.set(p.platform, p.username); });
        setPlatformProfiles(map);
      });
  }, [selectedProject]);

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

  // Fetch custom commemorative dates
  useEffect(() => {
    if (!selectedProject || !user) { setCustomDates([]); return; }
    supabase
      .from('commemorative_dates')
      .select('id, date, title')
      .eq('project_id', selectedProject.id)
      .then(({ data }) => setCustomDates((data ?? []).map(d => ({ id: d.id, date: d.date, title: d.title }))));
  }, [selectedProject, user]);

  const addCommemorativeDate = async () => {
    if (!newDateTitle.trim() || !newDateValue || !user || !selectedProject) return;
    const dateStr = format(newDateValue, 'yyyy-MM-dd');
    const { data } = await supabase
      .from('commemorative_dates')
      .insert({ project_id: selectedProject.id, title: newDateTitle.trim(), date: dateStr, created_by: user.id } as any)
      .select('id, date, title')
      .single();
    if (data) setCustomDates(prev => [...prev, { id: data.id, date: data.date, title: data.title }]);
    setNewDateTitle('');
    setNewDateValue(undefined);
    setAddDateDialogOpen(false);
    toast({ title: 'Data comemorativa adicionada!' });
  };

  const removeCommemorativeDate = async (id: string) => {
    await supabase.from('commemorative_dates').delete().eq('id', id);
    setCustomDates(prev => prev.filter(d => d.id !== id));
  };

  const importCommemorativeDates = async (month: number) => {
    if (!user || !selectedProject) return;
    const mm = String(month + 1).padStart(2, '0');
    const year = currentDate.getFullYear();
    const datesToImport = COMMEMORATIVE_DATES.filter(d => d.date.startsWith(mm));
    const existing = new Set(customDates.map(d => `${d.date}|${d.title}`));
    const newDates = datesToImport.filter(d => {
      const fullDate = `${year}-${d.date}`;
      return !existing.has(`${fullDate}|${d.title}`);
    });
    if (newDates.length === 0) {
      toast({ title: 'Todas as datas deste mês já foram importadas.' });
      return;
    }
    const inserts = newDates.map(d => ({
      project_id: selectedProject.id,
      title: d.title,
      date: `${year}-${d.date}`,
      created_by: user.id,
    }));
    const { data } = await supabase.from('commemorative_dates').insert(inserts as any).select('id, date, title');
    if (data) setCustomDates(prev => [...prev, ...data.map(d => ({ id: d.id, date: d.date, title: d.title }))]);
    setImportDialogOpen(false);
    toast({ title: `${data?.length ?? 0} datas importadas!` });
  };

  const getCommemorativesForDate = (dateStr: string) => {
    const preset = getCommemorativeDatesForDay(dateStr);
    const custom = customDates.filter(d => d.date === dateStr).map(d => d.title);
    // Merge unique
    const all = [...new Set([...preset, ...custom])];
    return all;
  };

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

  const getContentsForDate = (dateStr: string) => displayContents.filter(c => c.publish_date === dateStr);
  const getTasksForDate = (dateStr: string) => tasks.filter(t => t.due_date === dateStr);
  const undatedTasks = tasks.filter(t => !t.due_date);
  
  // Get contents for specific hour on a date
  const getContentsForDateAndHour = (dateStr: string, hour: number) => {
    return displayContents.filter(c => {
      if (c.publish_date !== dateStr || !c.publish_time) return false;
      const contentHour = parseInt(c.publish_time.split(':')[0]);
      return contentHour === hour;
    });
  };
  
  // Get contents without time for a date (show at top)
  const getContentsWithoutTime = (dateStr: string) => {
    return displayContents.filter(c => c.publish_date === dateStr && !c.publish_time);
  };

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
    const overId = String(over.id);
    
    // Parse drop zone ID - can be 'dateStr' or 'dateStr-hour'
    const parts = overId.split('-');
    let newDate: string;
    let newHour: string | undefined;
    
    if (parts.length >= 4) {
      // Format: YYYY-MM-DD-HH
      newDate = parts.slice(0, 3).join('-');
      newHour = parts[3] + ':00';
    } else {
      // Format: YYYY-MM-DD
      newDate = overId;
      newHour = undefined;
    }

    if (data?.type === 'content') {
      const content = displayContents.find(c => c.id === active.id);
      if (!content || (content.publish_date === newDate && content.publish_time === newHour)) return;
      
      // Update content with new date and optionally time
      const updates: any = { publish_date: newDate };
      if (newHour !== undefined) {
        updates.publish_time = newHour;
      }
      
      await supabase.from('contents').update(updates).eq('id', String(active.id));
      // Refresh the content list or update local state as needed
      updateContentDate(String(active.id), newDate);
    } else if (data?.type === 'task') {
      const taskId = (active.id as string).replace('task-', '');
      const task = tasks.find(t => t.id === taskId);
      if (!task || task.due_date === newDate) return;
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, due_date: newDate } : t));
      await supabase.from('project_tasks').update({ due_date: newDate } as any).eq('id', taskId);
    }
  };

  // --- Render day cell contents (for month view and fixed section) ---
  const renderDayItems = (dateStr: string) => {
    const dayContents = showContents ? getContentsForDate(dateStr) : [];
    const dayTasks = showTasks ? getTasksForDate(dateStr) : [];
    const commemoratives = showDates ? getCommemorativesForDate(dateStr) : [];
    return (
      <>
        {commemoratives.length > 0 && (
          <div className="space-y-0.5 mb-1">
            {commemoratives.map((title, i) => (
              <div key={i} className="flex items-start gap-1 px-1.5 py-[3px] text-[12px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-l-2 border-l-amber-500/50">
                <Star size={10} className="flex-shrink-0 mt-[2px]" />
                <span className="break-words whitespace-normal leading-tight">{title}</span>
              </div>
            ))}
          </div>
        )}
        {dayContents.slice(0, viewMode === 'week' ? 10 : 4).map(c => (
          <DraggableContent key={c.id} content={c} onClick={() => setPreviewContent(c)} disabled={isClient} platformProfiles={platformProfiles} />
        ))}
        {viewMode === 'month' && dayContents.length > 4 && (
          <span className="text-[10px] text-muted-foreground pl-1">+{dayContents.length - 4} mais</span>
        )}
        {dayTasks.map(t => (
          <EditableCalTask key={t.id} task={t} onToggle={toggleTask} onUpdate={updateTaskText} />
        ))}
      </>
    );
  };
  
  // --- Render fixed top section for week view (dates + tasks without time) ---
  const renderFixedTopSection = (dateStr: string) => {
    const dayTasks = showTasks ? getTasksForDate(dateStr) : [];
    const commemoratives = showDates ? getCommemorativesForDate(dateStr) : [];
    const contentsWithoutTime = showContents ? getContentsWithoutTime(dateStr) : [];
    
    if (commemoratives.length === 0 && dayTasks.length === 0 && contentsWithoutTime.length === 0) {
      return null;
    }
    
    return (
      <div className="space-y-1">
        {commemoratives.map((title, i) => (
          <div key={`comm-${i}`} className="flex items-start gap-1 px-1.5 py-[2px] text-[12px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-l-2 border-l-amber-500/50">
            <Star size={10} className="flex-shrink-0 mt-[2px]" />
            <span className="break-words whitespace-normal leading-tight">{title}</span>
          </div>
        ))}
        {dayTasks.map(t => (
          <EditableCalTask key={t.id} task={t} onToggle={toggleTask} onUpdate={updateTaskText} />
        ))}
        {contentsWithoutTime.map(c => (
          <DraggableContent key={c.id} content={c} onClick={() => setPreviewContent(c)} disabled={isClient} />
        ))}
      </div>
    );
  };

  return (
    <>
      <TopBar title="Calendário" subtitle="Planejamento de conteúdos" />
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>      <div className="flex h-[calc(100vh-130px)]">
        {/* Main calendar area */}
        <div className="flex-1 min-w-0 flex flex-col bg-background">
          {/* Toolbar */}
          <div className="flex flex-col border-b border-border/50">
            {/* Top row: filters + view toggle */}
            <div className="flex items-center gap-3 px-4 pt-2.5 pb-1.5">
              {/* Filters */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowContents(prev => !prev)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border",
                    showContents
                      ? "bg-primary/10 text-primary border-primary/20"
                      : "text-muted-foreground border-border hover:bg-muted"
                  )}
                >
                  <LayoutGrid size={11} />
                  Conteúdos
                  {showContents ? <Eye size={10} /> : <EyeOff size={10} className="opacity-50" />}
                </button>
                <button
                  onClick={() => setShowTasks(prev => !prev)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border",
                    showTasks
                      ? "bg-primary/10 text-primary border-primary/20"
                      : "text-muted-foreground border-border hover:bg-muted"
                  )}
                >
                  <CheckSquare size={11} />
                  Tarefas
                  {showTasks ? <Eye size={10} /> : <EyeOff size={10} className="opacity-50" />}
                </button>
                <button
                  onClick={() => setShowDates(prev => !prev)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border",
                    showDates
                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                      : "text-muted-foreground border-border hover:bg-muted"
                  )}
                >
                  <Star size={11} />
                  Datas
                  {showDates ? <Eye size={10} /> : <EyeOff size={10} className="opacity-50" />}
                </button>
                {!isClient && (
                  <>
                    <button
                      onClick={() => setAddDateDialogOpen(true)}
                      className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium text-muted-foreground border border-dashed border-border hover:bg-muted transition-colors"
                    >
                      <Plus size={10} /> Data
                    </button>
                    <button
                      onClick={() => setImportDialogOpen(true)}
                      className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium text-muted-foreground border border-dashed border-border hover:bg-muted transition-colors"
                    >
                      <PartyPopper size={10} /> Importar
                    </button>
                  </>
                )}
              </div>

              {/* View mode toggle */}
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

            {/* Bottom row: navigation */}
            <div className="flex items-center gap-2 px-4 pb-2.5">
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
            </div>
          </div>

          {/* Calendar grid */}
            <div className="flex-1 overflow-y-auto">
              {/* Day name headers */}
              {viewMode === 'week' ? (
                <div className="grid grid-cols-7 border-b border-border/40 sticky top-0 bg-background z-10">
                  {getWeekDays().map((d, i) => (
                    <div key={i} className="flex flex-col items-center py-2 border-r border-border/40 last:border-r-0 min-w-0">
                      <span className={cn(
                        "text-[11px] font-medium lowercase tracking-wide",
                        isDateToday(d) ? "text-primary" : "text-muted-foreground"
                      )}>
                        {DAYS_SHORT[d.getDay()].toLowerCase()}
                      </span>
                      <span
                        className={cn(
                          "text-[22px] leading-tight font-light mt-0.5 w-9 h-9 flex items-center justify-center rounded-full transition-colors",
                          isDateToday(d)
                            ? "bg-primary text-primary-foreground font-normal"
                            : "text-foreground"
                        )}
                      >
                        {d.getDate()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-7 border-b border-border/40 sticky top-0 bg-background z-10">
                  {DAYS_SHORT.map(d => (
                    <div key={d} className="py-2 text-center text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                      {d}
                    </div>
                  ))}
                </div>
              )}

              {/* Week view with hourly grid */}
              {viewMode === 'week' && (
                <div className="grid grid-cols-7 flex-1">
                  {getWeekDays().map((d, i) => {
                    const dateStr = fmtDateStr(d);
                    const dayContents = showContents ? getContentsForDate(dateStr) : [];
                    const dayTasks = showTasks ? getTasksForDate(dateStr) : [];
                    const commemoratives = showDates ? getCommemorativesForDate(dateStr) : [];
                    return (
                      <DroppableDay
                        key={i}
                        dateStr={dateStr}
                        isToday={isDateToday(d)}
                        tall
                      >
                        {commemoratives.length > 0 && (
                          <div className="space-y-0.5 mb-1.5">
                            {commemoratives.map((title, ci) => (
                              <div key={ci} className="flex items-start gap-1 px-1.5 py-[3px] text-[12px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-l-2 border-l-amber-500/50">
                                <Star size={10} className="flex-shrink-0 mt-[2px]" />
                                <span className="break-words whitespace-normal leading-tight">{title}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="space-y-2">
                          {dayContents.map(c => (
                            <WeeklyContentCard key={c.id} content={c} onClick={() => setPreviewContent(c)} disabled={isClient} hideProjectName />
                          ))}
                        </div>
                        {dayTasks.length > 0 && (
                          <div className="space-y-0.5 mt-1.5">
                            {dayTasks.map(t => (
                              <EditableCalTask key={t.id} task={t} onToggle={toggleTask} onUpdate={updateTaskText} />
                            ))}
                          </div>
                        )}
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
                      <div key={di} className="min-h-[140px] border-b border-r border-border/40 last:border-r-0 bg-muted/10" />
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
        </div>
      </div>
      </DndContext>

      {/* Client preview sheet */}
      <Sheet open={!!previewContent} onOpenChange={(open) => { if (!open) setPreviewContent(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
          {previewContent && (() => {
            const previewPlatform = Array.isArray(previewContent.platform) ? previewContent.platform[0] : previewContent.platform;
            return (
              <div className="flex flex-col h-full">
                <div className="px-6 pt-6 pb-4 border-b border-border">
                  <SheetTitle className="text-lg font-semibold text-foreground mb-3">
                    {previewContent.title}
                  </SheetTitle>
                  <div className="flex flex-wrap gap-2">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-primary-foreground",
                      STATUS_COLORS[previewContent.status as WorkflowStatus]
                    )}>
                      {STATUS_LABELS[previewContent.status as WorkflowStatus]}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                      {CONTENT_TYPE_LABELS[previewContent.content_type as ContentType] || previewContent.content_type}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                      {platformIcon(previewContent.platform, 14)}
                    </span>
                  </div>
                </div>

                <div className="px-6 py-3 border-b border-border/50 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  {previewContent.publish_date && (
                    <div className="flex items-center gap-1.5">
                      <CalIcon size={12} />
                      <span>
                        {new Date(previewContent.publish_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                        {(previewContent as any).publish_time && ` às ${(previewContent as any).publish_time}`}
                      </span>
                    </div>
                  )}
                  {previewContent.assignee_profile && (
                    <div className="flex items-center gap-1.5">
                      <User size={12} />
                      <span>{previewContent.assignee_profile.display_name}</span>
                    </div>
                  )}
                </div>

                {previewContent.description && (
                  <div className="px-6 py-4 border-b border-border/50">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Briefing</h4>
                    <div 
                      className="text-sm text-foreground prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-ul:text-foreground prose-ol:text-foreground prose-li:text-foreground" 
                      dangerouslySetInnerHTML={{ __html: previewContent.description }}
                    />
                  </div>
                )}

                <div className="px-6 py-4 flex-1">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pré-visualização</h4>
                  {previewPlatform ? (
                    <PostPreview content={previewContent} platform={previewPlatform as Platform} />
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">Preview não disponível</p>
                  )}
                </div>

                {previewContent.hashtags && previewContent.hashtags.length > 0 && (
                  <div className="px-6 py-3 border-t border-border/50">
                    <div className="flex flex-wrap gap-1.5">
                      {previewContent.hashtags.map((tag, i) => (
                        <span key={i} className="text-xs text-primary font-medium">#{tag}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fixed Footer with Quick Actions for Client */}
                {(previewContent.status === 'approval-client' || previewContent.status === 'scheduled' || previewContent.status === 'published') && (
                  <div className="mt-auto px-6 py-5 border-t border-border bg-card sticky bottom-0 z-20 flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 h-10 gap-1.5 text-[13px] font-bold uppercase tracking-[1px] border-0 rounded-[5px]"
                      style={{ backgroundColor: '#c5daf7', color: '#1369db' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(previewContent.copy_text ?? '');
                        toast({ title: 'Texto copiado!' });
                      }}
                    >
                      <Copy size={14} /> Copiar texto
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 h-10 gap-1.5 text-[13px] font-bold uppercase tracking-[1px] border-0 rounded-[5px]"
                      style={{ backgroundColor: '#c5daf7', color: '#1369db' }}
                      onClick={async (e) => {
                        e.stopPropagation();
                        const urls: string[] = [];
                        if (previewContent.media_urls && Array.isArray(previewContent.media_urls)) {
                          urls.push(...previewContent.media_urls.filter(Boolean));
                        }
                        if (previewContent.media_url && !urls.includes(previewContent.media_url)) {
                          urls.push(previewContent.media_url);
                        }
                        
                        if (urls.length === 0) return;
                        
                        toast({ title: 'Preparando download...', description: 'Aguarde um momento.' });

                        try {
                          const zip = new JSZip();
                          await Promise.all(urls.map(async (url, i) => {
                            const res = await fetch(url);
                            const blob = await res.blob();
                            const ext = url.split('.').pop()?.split('?')[0] || 'jpg';
                            zip.file(`${previewContent.title.replace(/[^a-zA-Z0-9]/g, '_')}_${i + 1}.${ext}`, blob);
                          }));
                          const zipBlob = await zip.generateAsync({ type: 'blob' });
                          const a = document.createElement('a');
                          a.href = URL.createObjectURL(zipBlob);
                          a.download = `${previewContent.title.replace(/[^a-zA-Z0-9]/g, '_')}_midias.zip`;
                          a.click();
                          URL.revokeObjectURL(a.href);
                          toast({ title: 'Download concluído!' });
                        } catch (err) {
                          console.error('Download error:', err);
                          toast({ title: 'Erro ao baixar mídias', description: 'Por favor, tente novamente.', variant: 'destructive' });
                        }
                      }}
                    >
                      <Download size={14} /> Baixar mídias
                    </Button>
                  </div>
                )}
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* Add commemorative date dialog */}
      <Dialog open={addDateDialogOpen} onOpenChange={setAddDateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Data Comemorativa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Nome da data *</label>
              <Input
                value={newDateTitle}
                onChange={e => setNewDateTitle(e.target.value)}
                placeholder="Ex: Dia do Cliente"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Data *</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !newDateValue && "text-muted-foreground")}>
                    <CalIcon className="mr-2 h-4 w-4" />
                    {newDateValue ? format(newDateValue, 'dd MMM yyyy', { locale: ptBR }) : 'Selecionar data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newDateValue}
                    onSelect={setNewDateValue}
                    locale={ptBR}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddDateDialogOpen(false)}>Cancelar</Button>
              <Button onClick={addCommemorativeDate} disabled={!newDateTitle.trim() || !newDateValue}>Adicionar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import commemorative dates dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar Datas Comemorativas</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">
            Selecione um mês para importar as datas comemorativas mais relevantes para o seu calendário.
            <br />
            <span className="text-[11px]">Fonte: datascomemorativas.me</span>
          </p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((m, i) => (
              <button
                key={i}
                onClick={() => setImportMonth(i)}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-colors border",
                  importMonth === i
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "text-muted-foreground border-border hover:bg-muted"
                )}
              >
                {m}
              </button>
            ))}
          </div>
          {/* Preview dates for selected month */}
          <div className="space-y-1 max-h-60 overflow-y-auto border border-border/50 rounded-lg p-3">
            {COMMEMORATIVE_DATES.filter(d => d.date.startsWith(String(importMonth + 1).padStart(2, '0'))).map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-sm py-1">
                <Star size={10} className="text-amber-500 flex-shrink-0" />
                <span className="text-muted-foreground text-xs w-10 flex-shrink-0">{d.date.slice(3)}/{d.date.slice(0, 2)}</span>
                <span className="text-foreground truncate">{d.title}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => importCommemorativeDates(importMonth)}>
              Importar mês
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CalendarPage;
