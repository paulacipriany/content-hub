import { Search, Bell, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TopBarProps {
  title?: string;
  subtitle?: string;
}

const TopBar = ({ title, subtitle }: TopBarProps) => {
  return (
    <header className="flex items-center justify-between h-14 px-6 border-b border-border bg-card flex-shrink-0">
      <div>
        {title && <h1 className="text-lg font-semibold text-foreground">{title}</h1>}
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:flex items-center">
          <Search size={16} className="absolute left-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar conteúdos..."
            className="h-9 pl-9 pr-4 rounded-lg bg-secondary text-sm text-foreground placeholder:text-muted-foreground border-none outline-none focus:ring-2 focus:ring-ring/20 w-64"
          />
        </div>

        {/* Notifications */}
        <button className="relative w-9 h-9 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors">
          <Bell size={18} className="text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
        </button>

        {/* Create */}
        <Button size="sm" className="gap-1.5 h-9">
          <Plus size={16} />
          <span className="hidden sm:inline">Criar conteúdo</span>
        </Button>
      </div>
    </header>
  );
};

export default TopBar;
