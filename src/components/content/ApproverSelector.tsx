import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserCheck, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Profile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface ApproverSelectorProps {
  selectedApprovers: string[];
  onChange: (approverIds: string[]) => void;
  label?: string;
}

const ApproverSelector = ({ selectedApprovers, onChange, label }: ApproverSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    supabase.from('profiles').select('user_id, display_name, avatar_url').then(({ data }) => {
      setProfiles(data ?? []);
    });
  }, [open]);

  const filtered = search.trim()
    ? profiles.filter(p => p.display_name?.toLowerCase().includes(search.toLowerCase()))
    : profiles;

  const selectedProfiles = profiles.filter(p => selectedApprovers.includes(p.user_id));

  const toggleApprover = (userId: string) => {
    if (selectedApprovers.includes(userId)) {
      onChange(selectedApprovers.filter(id => id !== userId));
    } else {
      onChange([...selectedApprovers, userId]);
    }
  };

  const removeApprover = (userId: string) => {
    onChange(selectedApprovers.filter(id => id !== userId));
  };

  return (
    <div className="space-y-1.5">
      {label && <span className="text-sm font-medium">{label}</span>}
      
      {/* Selected approvers badges */}
      {selectedApprovers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {selectedProfiles.map(p => (
            <Badge key={p.user_id} variant="secondary" className="gap-1 pr-1">
              <span className="text-xs">{p.display_name ?? 'Sem nome'}</span>
              <button
                type="button"
                onClick={() => removeApprover(p.user_id)}
                className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
              >
                <X size={10} />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 h-9 px-3 text-sm rounded-md border border-input bg-background text-foreground w-full hover:bg-secondary transition-colors text-left"
          >
            <UserCheck size={14} className="text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">
              {selectedApprovers.length === 0
                ? 'Selecionar aprovadores'
                : `${selectedApprovers.length} aprovador${selectedApprovers.length > 1 ? 'es' : ''} selecionado${selectedApprovers.length > 1 ? 's' : ''}`}
            </span>
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
              filtered.map(p => {
                const isSelected = selectedApprovers.includes(p.user_id);
                return (
                  <button
                    key={p.user_id}
                    type="button"
                    onClick={() => toggleApprover(p.user_id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-sm transition-colors flex items-center gap-2 ${
                      isSelected
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-secondary text-foreground'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-primary border-primary' : 'border-input'
                    }`}>
                      {isSelected && <span className="text-primary-foreground text-[10px]">✓</span>}
                    </div>
                    {p.display_name ?? 'Sem nome'}
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default ApproverSelector;
