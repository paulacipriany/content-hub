import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/contexts/AppContext';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { STATUS_COLORS, STATUS_LABELS, WorkflowStatus } from '@/data/types';
import { platformIcon } from '@/components/content/ContentCard';
import { cn } from '@/lib/utils';

const DAYS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

const CalendarPage = () => {
  const { contents, setSelectedContent } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());

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

  const getContentsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return contents.filter(c => c.publish_date === dateStr);
  };

  const today = new Date();
  const isToday = (day: number) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <>
      <TopBar title="Calendário" subtitle="Planejamento mensal de conteúdos" />
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors">
            <ChevronLeft size={18} className="text-muted-foreground" />
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-xs font-medium rounded-md bg-secondary hover:bg-accent transition-colors text-foreground">
            Hoje
          </button>
          <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors">
            <ChevronRight size={18} className="text-muted-foreground" />
          </button>
          <span className="text-lg font-semibold text-foreground capitalize">{monthName}</span>
        </div>

        <div className="border border-border rounded-xl overflow-hidden bg-card">
          <div className="grid grid-cols-7 border-b border-border">
            {DAYS.map(d => (
              <div key={d} className="py-2.5 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">{d}</div>
            ))}
          </div>

          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 border-b border-border last:border-b-0">
              {week.map((day, di) => {
                const dayContents = day ? getContentsForDay(day) : [];
                return (
                  <div key={di} className={cn("min-h-[120px] p-2 border-r border-border last:border-r-0 transition-colors", !day && "bg-secondary/30", day && "hover:bg-secondary/20")}>
                    {day && (
                      <>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={cn("text-sm font-medium", isToday(day) ? "w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center" : "text-foreground")}>
                            {day}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {dayContents.slice(0, 3).map(c => (
                            <button
                              key={c.id}
                              onClick={() => setSelectedContent(c)}
                              className={cn("w-full text-left px-1.5 py-1 rounded text-[11px] font-medium truncate flex items-center gap-1 hover:opacity-80 transition-opacity", STATUS_COLORS[c.status as WorkflowStatus], "text-primary-foreground")}
                            >
                              {platformIcon(c.platform, 10)}
                              <span className="truncate">{c.title}</span>
                            </button>
                          ))}
                          {dayContents.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">+{dayContents.length - 3} mais</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default CalendarPage;
