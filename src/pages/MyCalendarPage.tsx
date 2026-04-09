import { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronLeft, ChevronRight, CalendarDays, CalendarRange, Star, Filter } from 'lucide-react';
import { CONTENT_TYPE_LABELS, PLATFORM_LABELS, STATUS_LABELS, STATUS_COLORS, ContentType, Platform, WorkflowStatus, ContentWithRelations } from '@/data/types';
import { platformIcon } from '@/components/content/PlatformIcons';
import { cn } from '@/lib/utils';
import { format, startOfWeek, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import PostPreview from '@/components/content/PostPreview';
import { getCommemorativeDatesForDay } from '@/data/commemorativeDates';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';

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
  const [filterPlatforms, setFilterPlatforms] = useState<Platform[]>([]);
  const [filterContentTypes, setFilterContentTypes] = useState<ContentType[]>([]);
  const [filterStatuses, setFilterStatuses] = useState<WorkflowStatus[]>([]);
  const [filterProjects, setFilterProjects] = useState<string[]>([]);

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

  const filteredContents = useMemo(() => {
    let filtered = contents;
    if (filterPlatforms.length > 0) {
      filtered = filtered.filter(c => {
        const platforms = Array.isArray(c.platform) ? c.platform : [c.platform];
        return platforms.some(p => filterPlatforms.includes(p as Platform));
      });
    }
    if (filterContentTypes.length > 0) {
      filtered = filtered.filter(c => filterContentTypes.includes(c.content_type as ContentType));
    }
    if (filterStatuses.length > 0) {
      filtered = filtered.filter(c => filterStatuses.includes(c.status as WorkflowStatus));
    }
    return filtered;
  }, [contents, filterPlatforms, filterContentTypes, filterStatuses]);

  const getContentsForDate = (dateStr: string) => filteredContents.filter(c => c.publish_date === dateStr);

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
    const firstPlatform = platforms[0];
    const dotColor = `hsl(var(${STATUS_CSS_VAR[content.status] ?? '--status-idea'}))`;
    const project = projectMap[content.project_id];
    const contentTypeLabel = CONTENT_TYPE_LABELS[content.content_type as ContentType] || content.content_type;
    const handle = project?.name ? project.name.toLowerCase().replace(/\s+/g, '.').slice(0, 15) : '';

    return (
      <div
        onClick={() => setPreviewContent(content)}
        className="w-full text-left py-[3px] px-1.5 rounded-sm hover:bg-muted/60 transition-all cursor-pointer overflow-hidden min-w-0"
        title={`${content.title} — ${project?.name ?? ''}`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
          <span className="shrink-0">{platformIcon([firstPlatform] as any, 14)}</span>
          <span className="text-[12px] font-semibold text-foreground whitespace-nowrap">{contentTypeLabel}</span>
          {handle && (
            <span className="text-[11px] text-muted-foreground truncate">
              {project && (
                <span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{ backgroundColor: project.color }} />
              )}
              {handle}
            </span>
          )}
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
          {dayContents.slice(0, 4).map(c => <ContentCard key={c.id} content={c} />)}
          {dayContents.length > 4 && (
            <div className="flex justify-end px-1 pt-0.5">
              <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold leading-none">
                +{dayContents.length - 4} mais
              </span>
            </div>
          )}
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
          {/* Platform filter */}
          <Popover>
            <PopoverTrigger asChild>
              <button className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border",
                filterPlatforms.length > 0 ? "bg-primary/10 text-primary border-primary/20" : "text-muted-foreground border-border hover:bg-muted"
              )}>
                <Filter size={11} />Plataforma
                {filterPlatforms.length > 0 && <span className="ml-0.5 px-1 py-0 rounded-full bg-primary text-primary-foreground text-[9px] leading-[14px]">{filterPlatforms.length}</span>}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="space-y-1">
                {(Object.entries(PLATFORM_LABELS) as [Platform, string][]).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer text-xs">
                    <Checkbox checked={filterPlatforms.includes(key)} onCheckedChange={(checked) => setFilterPlatforms(prev => checked ? [...prev, key] : prev.filter(p => p !== key))} />
                    <span className="flex items-center gap-1.5">{platformIcon([key] as any, 14)}{label}</span>
                  </label>
                ))}
                {filterPlatforms.length > 0 && <button onClick={() => setFilterPlatforms([])} className="w-full text-[11px] text-muted-foreground hover:text-foreground py-1 mt-1 border-t border-border">Limpar filtro</button>}
              </div>
            </PopoverContent>
          </Popover>
          {/* Content type filter */}
          <Popover>
            <PopoverTrigger asChild>
              <button className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border",
                filterContentTypes.length > 0 ? "bg-primary/10 text-primary border-primary/20" : "text-muted-foreground border-border hover:bg-muted"
              )}>
                <Filter size={11} />Tipo
                {filterContentTypes.length > 0 && <span className="ml-0.5 px-1 py-0 rounded-full bg-primary text-primary-foreground text-[9px] leading-[14px]">{filterContentTypes.length}</span>}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="space-y-1">
                {(Object.entries(CONTENT_TYPE_LABELS) as [ContentType, string][]).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer text-xs">
                    <Checkbox checked={filterContentTypes.includes(key)} onCheckedChange={(checked) => setFilterContentTypes(prev => checked ? [...prev, key] : prev.filter(t => t !== key))} />
                    {label}
                  </label>
                ))}
                {filterContentTypes.length > 0 && <button onClick={() => setFilterContentTypes([])} className="w-full text-[11px] text-muted-foreground hover:text-foreground py-1 mt-1 border-t border-border">Limpar filtro</button>}
              </div>
            </PopoverContent>
          </Popover>
          {/* Status filter */}
          <Popover>
            <PopoverTrigger asChild>
              <button className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border",
                filterStatuses.length > 0 ? "bg-primary/10 text-primary border-primary/20" : "text-muted-foreground border-border hover:bg-muted"
              )}>
                <Filter size={11} />Status
                {filterStatuses.length > 0 && <span className="ml-0.5 px-1 py-0 rounded-full bg-primary text-primary-foreground text-[9px] leading-[14px]">{filterStatuses.length}</span>}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-2" align="start">
              <div className="space-y-1">
                {(Object.entries(STATUS_LABELS) as [WorkflowStatus, string][]).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer text-xs">
                    <Checkbox checked={filterStatuses.includes(key)} onCheckedChange={(checked) => setFilterStatuses(prev => checked ? [...prev, key] : prev.filter(s => s !== key))} />
                    <span className="flex items-center gap-1.5">
                      <span className={cn("w-2 h-2 rounded-full", STATUS_COLORS[key])} />
                      {label}
                    </span>
                  </label>
                ))}
                {filterStatuses.length > 0 && <button onClick={() => setFilterStatuses([])} className="w-full text-[11px] text-muted-foreground hover:text-foreground py-1 mt-1 border-t border-border">Limpar filtro</button>}
              </div>
            </PopoverContent>
          </Popover>
          {/* Clear all filters */}
          {(filterPlatforms.length > 0 || filterContentTypes.length > 0 || filterStatuses.length > 0) && (
            <button
              onClick={() => { setFilterPlatforms([]); setFilterContentTypes([]); setFilterStatuses([]); }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium text-destructive border border-destructive/30 hover:bg-destructive/10 transition-colors"
            >
              Limpar todos
            </button>
          )}
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

      {/* Post preview dialog */}
      <Dialog open={!!previewContent} onOpenChange={open => !open && setPreviewContent(null)}>
        <DialogContent className="sm:max-w-sm p-0 overflow-hidden rounded-xl">
          {previewContent && (
            <div className="flex flex-col max-h-[80vh] overflow-y-auto">
              <DialogHeader className="px-4 pt-4 pb-2">
                <DialogTitle className="text-base font-semibold text-foreground">Detalhes do post</DialogTitle>
              </DialogHeader>
              <div className="px-4 pb-4">
                <PostPreview content={previewContent} platform={(Array.isArray(previewContent.platform) ? previewContent.platform[0] : previewContent.platform) as any} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyCalendarPage;
