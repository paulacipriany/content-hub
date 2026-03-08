import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';

interface AssigneeSelectorProps {
  currentAssigneeId: string | null;
  assigneeName: string;
  onChangeAssignee: (userId: string) => Promise<void>;
}

const AssigneeSelector = ({ currentAssigneeId, assigneeName, onChangeAssignee }: AssigneeSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState<{ user_id: string; display_name: string | null }[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    supabase.from('profiles').select('user_id, display_name').then(({ data }) => {
      setProfiles(data ?? []);
    });
  }, [open]);

  const filtered = search.trim()
    ? profiles.filter(p => p.display_name?.toLowerCase().includes(search.toLowerCase()))
    : profiles;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 h-8 px-3 text-xs rounded-md border border-input bg-background text-foreground flex-1 hover:bg-secondary transition-colors text-left">
          <User size={12} className="text-muted-foreground" />
          <span>{assigneeName}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <Input
          placeholder="Buscar usuário..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-8 text-sm mb-2"
        />
        <div className="max-h-48 overflow-y-auto space-y-0.5">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">Nenhum usuário encontrado</p>
          ) : (
            filtered.map(p => (
              <button
                key={p.user_id}
                onClick={async () => {
                  await onChangeAssignee(p.user_id);
                  setOpen(false);
                  setSearch('');
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-md text-sm transition-colors ${
                  p.user_id === currentAssigneeId
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'hover:bg-secondary text-foreground'
                }`}
              >
                {p.display_name ?? 'Sem nome'}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AssigneeSelector;
