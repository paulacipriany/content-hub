import { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronLeft, ChevronRight, CalendarDays, CalendarRange, Star } from 'lucide-react';
import { STATUS_COLORS, STATUS_LABELS, WorkflowStatus, ContentWithRelations } from '@/data/types';
import { platformIcon } from '@/components/content/PlatformIcons';
import { cn } from '@/lib/utils';
import { format, startOfWeek, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import PostPreview from '@/components/content/PostPreview';
import { contrastText } from '@/lib/clientPalette';
import { getCommemorativeDatesForDay } from '@/data/commemorativeDates';
import { supabase } from '@/integrations/supabase/client';

const DAYS_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

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

const MyCalendarPage = () => {
  const { contents, projects } = useApp();
  const { role } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('month');
  const [previewContent, setPreviewContent] = useState<ContentWithRelations | null>(null);
  const [customDates, setCustomDates] = useState<{ id: string; date: string; title: string }[]>([]);

  const projectMap = useMemo(() => {
    const map: Record<string, { name: string; color: string }> = {};
    projects.forEach(p => { map[p.id] = { name: p.name, color: p.color }; });
    return map;
  }, [projects]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();
  const isDateToday = (d: Date) =>
    d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  const fmtDateStr = (d: Date) => format(d, 'yyyy-MM-dd');

  const getContentsForDate = (dateStr: string) => contents.filter(c => c.publish_date === dateStr);

  const getWeekDays = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  const getMonthWeeks = () => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let startDay = firstDay.getDay();
    const weeks: Date[][] = [];
    let current = new Date(firstDay);
    current.setDate(current.getDate() - startDay);
    while (current <= lastDay || weeks.length < 6) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
      weeks.push(week);
      if (current > lastDay && weeks.length >= 5) break;
    }
    return weeks;
  };

  const prev = () => {
    if (viewMode === 'month') setCurrentDate(new Date(year, month - 1, 1));
    else setCurrentDate(addDays(currentDate, -7));
  };
  const next = () => {
    if (viewMode === 'month') setCurrentDate(new Date(year, month + 1, 1));
    else setCurrentDate(addDays(currentDate, 7));
  };
  const goToday = () => setCurrentDate(new Date());

  const ContentCard = ({ content }: { content: ContentWithRelations }) => {
    const platforms: string[] = Array.isArray(content.platform) ? content.platform : [content.platform];
    const borderColor = `hsl(var(${STATUS_CSS_VAR[content.status] ?? '--status-idea'}))`;
    const project = projectMap[content.project_id];

    return (
      <div
        onClick={() => setPreviewContent(content)}
        className="w-full text-left px-1 py-0.5 bg-card border border-border/60 shadow-sm border-l-[2px] rounded-sm hover:shadow-md transition-all cursor-pointer overflow-hidden min-w-0 max-h-[40px]"
        style={{ borderLeftColor: borderColor }}
        title={`${content.title} — ${project?.name ?? ''}`}
      >
        <div className="flex items-center gap-0.5 min-w-0">
          {platforms.slice(0, 1).map((p, i) => (
            <span key={i} className="shrink-0">{platformIcon([p] as any, 10)}</span>
          ))}
          <p className="text-[10px] font-medium text-foreground truncate leading-none">
            {content.title}
          </p>
        </div>
        <div className="flex items-center gap-1 min-w-0">
          {project && (
            <span
              className="text-[7px] px-1 rounded font-semibold uppercase truncate"
              style={{ backgroundColor: project.color, color: contrastText(project.color) }}
            >
              {project.name}
            </span>
          )}
          <span className="text-[8px] text-muted-foreground truncate leading-none">
            {STATUS_LABELS[content.status as WorkflowStatus]}
          </span>
        </div>
      </div>
    );
  };

  const DayCell = ({ date, isCurrentMonth = true }: { date: Date; isCurrentMonth?: boolean; dayName?: string }) => {
    const dateStr = fmtDateStr(date);
    const dayContents = getContentsForDate(dateStr);
    const todayFlag = isDateToday(date);
    
    const presetCommemoratives = getCommemorativeDatesForDay(dateStr);
    const customCommemoratives = customDates.filter(d => d.date === dateStr).map(d => d.title);
    const commemoratives = [...new Set([...presetCommemoratives, ...customCommemoratives])];

    return (
      <div className={cn(
        "border-b border-r border-border/40 last:border-r-0 min-h-[120px] overflow-hidden",
        isCurrentMonth === false && "bg-muted/15"
      )}>
        <div className="flex flex-col items-end pt-1.5 pr-2 pb-1">
          <span className={cn(
            "text-sm leading-none flex items-center justify-center",
            todayFlag
              ? "w-7 h-7 rounded-full bg-primary text-primary-foreground font-semibold"
              : isCurrentMonth === false
                ? "text-muted-foreground/40 font-normal"
                : "text-foreground font-medium"
          )}>
            {date.getDate()}
          </span>
        </div>
        <div className="px-1 pb-1 space-y-0.5 overflow-y-auto max-h-[calc(100%-40px)] min-w-0">
          {commemoratives.length > 0 && (
            <div className="space-y-0.5 mb-1">
              {commemoratives.map((title, i) => (
                <div key={i} className="flex items-start gap-1 px-1.5 py-[2px] text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-l-2 border-l-amber-500/50">
                  <Star size={8} className="flex-shrink-0 mt-[2px]" />
                  <span className="break-words whitespace-normal leading-tight">{title}</span>
                </div>
              ))}
            </div>
          )}
          {dayContents.map(c => <ContentCard key={c.id} content={c} />)}
        </div>
      </div>
    );
  };

  // Projects that have at least one content
  const activeProjects = useMemo(() => {
    const ids = new Set(contents.map(c => c.project_id));
    return projects.filter(p => ids.has(p.id));
  }, [contents, projects]);

  useEffect(() => {
    if (activeProjects.length === 0) { setCustomDates([]); return; }
    const projectIds = activeProjects.map(p => p.id);
    supabase
      .from('commemorative_dates')
      .select('id, date, title, project_id')
      .in('project_id', projectIds)
      .then(({ data }) => setCustomDates((data ?? []).map(d => ({ id: d.id, date: d.date, title: d.title }))));
  }, [activeProjects]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border/60 bg-background flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-foreground">Meu Calendário</h1>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
            <button onClick={() => setViewMode('week')} className={cn("px-2.5 py-1 rounded-md text-xs font-medium transition-colors", viewMode === 'week' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
              <CalendarRange size={14} className="inline mr-1" />Semana
            </button>
            <button onClick={() => setViewMode('month')} className={cn("px-2.5 py-1 rounded-md text-xs font-medium transition-colors", viewMode === 'month' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
              <CalendarDays size={14} className="inline mr-1" />Mês
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={goToday} className="px-3 py-1 rounded-md text-xs font-medium border border-border hover:bg-muted transition-colors">Hoje</button>
          <button onClick={prev} className="p-1 rounded hover:bg-muted transition-colors"><ChevronLeft size={18} /></button>
          <span className="text-sm font-semibold min-w-[160px] text-center capitalize">
            {viewMode === 'month'
              ? format(currentDate, 'MMMM yyyy', { locale: ptBR })
              : `${format(getWeekDays()[0], 'dd MMM', { locale: ptBR })} — ${format(getWeekDays()[6], 'dd MMM yyyy', { locale: ptBR })}`
            }
          </span>
          <button onClick={next} className="p-1 rounded hover:bg-muted transition-colors"><ChevronRight size={18} /></button>
        </div>
      </div>

      {/* Legend */}
      {activeProjects.length > 0 && (
        <div className="flex items-center gap-3 px-6 py-2 border-b border-border/40 bg-muted/20 flex-shrink-0 flex-wrap">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Clientes:</span>
          {activeProjects.map(p => (
            <div key={p.id} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
              <span className="text-xs font-medium text-foreground">{p.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto">
        {viewMode === 'month' ? (
          <div className="min-w-[700px]">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-border/60 bg-muted/30">
              {DAYS_SHORT.map(d => (
                <div key={d} className="text-center py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground border-r border-border/40 last:border-r-0">
                  {d}
                </div>
              ))}
            </div>
            {/* Weeks */}
            {getMonthWeeks().map((week, wi) => (
              <div key={wi} className="grid grid-cols-7">
                {week.map((date, di) => (
                  <DayCell key={di} date={date} isCurrentMonth={date.getMonth() === month} />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="min-w-[700px]">
            <div className="grid grid-cols-7 border-b border-border/60 bg-muted/30">
              {getWeekDays().map((date, i) => {
                const todayFlag = isDateToday(date);
                return (
                  <div key={i} className="text-center py-2 border-r border-border/40 last:border-r-0">
                    <span className={cn("text-[11px] font-medium uppercase tracking-wide", todayFlag ? "text-primary" : "text-muted-foreground")}>
                      {DAYS_SHORT[i]}
                    </span>
                    <div className="mt-0.5">
                      <span className={cn("text-sm", todayFlag ? "w-7 h-7 rounded-full bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center" : "text-foreground font-medium")}>
                        {date.getDate()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-7">
              {getWeekDays().map((date, i) => (
                <DayCell key={i} date={date} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Preview sheet */}
      <Sheet open={!!previewContent} onOpenChange={open => !open && setPreviewContent(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0 overflow-y-auto">
          <SheetTitle className="sr-only">Preview</SheetTitle>
          {previewContent && <PostPreview content={previewContent} platform={(Array.isArray(previewContent.platform) ? previewContent.platform[0] : previewContent.platform) as any} />}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MyCalendarPage;
