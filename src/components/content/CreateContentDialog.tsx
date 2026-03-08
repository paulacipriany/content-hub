import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PLATFORM_LABELS, CONTENT_TYPE_LABELS, Platform, ContentType } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CalendarIcon, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface CreateContentDialogProps {
  trigger?: React.ReactNode;
  defaultProjectId?: string;
}

const CreateContentDialog = ({ trigger, defaultProjectId }: CreateContentDialogProps) => {
  const { projects, refetch } = useApp();
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [platform, setPlatform] = useState<Platform>('instagram');
  const [contentType, setContentType] = useState<ContentType>('feed');
  const [projectId, setProjectId] = useState(defaultProjectId ?? '');
  const [publishDate, setPublishDate] = useState<Date | undefined>();
  const [hashtagInput, setHashtagInput] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [assigneeEmail, setAssigneeEmail] = useState('');

  const reset = () => {
    setTitle('');
    setDescription('');
    setPlatform('instagram');
    setContentType('feed');
    setProjectId(defaultProjectId ?? '');
    setPublishDate(undefined);
    setHashtagInput('');
    setHashtags([]);
    setAssigneeEmail('');
  };

  const addHashtag = () => {
    const tag = hashtagInput.trim().startsWith('#') ? hashtagInput.trim() : `#${hashtagInput.trim()}`;
    if (tag.length > 1 && !hashtags.includes(tag)) {
      setHashtags(prev => [...prev, tag]);
      setHashtagInput('');
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !projectId || !user) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha ao menos o título e selecione um cliente.', variant: 'destructive' });
      return;
    }

    setLoading(true);

    // Resolve assignee by email if provided
    let assigneeId: string | null = null;
    if (assigneeEmail.trim()) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id')
        .ilike('display_name', `%${assigneeEmail.trim()}%`)
        .limit(1)
        .single();
      assigneeId = profile?.user_id ?? null;
    }

    const { error } = await supabase.from('contents').insert({
      title: title.trim(),
      description: description.trim(),
      platform,
      content_type: contentType,
      project_id: projectId,
      publish_date: publishDate ? format(publishDate, 'yyyy-MM-dd') : null,
      hashtags,
      assignee_id: assigneeId ?? user.id,
      created_by: user.id,
      status: 'idea',
    });

    setLoading(false);

    if (error) {
      toast({ title: 'Erro ao criar conteúdo', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Conteúdo criado!' });
      reset();
      setOpen(false);
      await refetch();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-1.5 h-9">
            <Plus size={16} />
            <span className="hidden sm:inline">Criar conteúdo</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Conteúdo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="content-title">Título *</Label>
            <Input
              id="content-title"
              placeholder="Ex: Post sobre lançamento..."
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          {/* Project */}
          <div className="space-y-1.5">
            <Label>Cliente *</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                      {p.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Platform + Type row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Plataforma</Label>
              <Select value={platform} onValueChange={v => setPlatform(v as Platform)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(PLATFORM_LABELS) as [Platform, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de conteúdo</Label>
              <Select value={contentType} onValueChange={v => setContentType(v as ContentType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(CONTENT_TYPE_LABELS) as [ContentType, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="content-desc">Descrição / Copy</Label>
            <Textarea
              id="content-desc"
              placeholder="Escreva a copy ou descrição do conteúdo..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Publish date */}
          <div className="space-y-1.5">
            <Label>Data de publicação</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !publishDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {publishDate ? format(publishDate, "dd 'de' MMMM, yyyy", { locale: ptBR }) : 'Selecionar data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={publishDate}
                  onSelect={setPublishDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Hashtags */}
          <div className="space-y-1.5">
            <Label>Hashtags</Label>
            <div className="flex gap-2">
              <Input
                placeholder="#hashtag"
                value={hashtagInput}
                onChange={e => setHashtagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addHashtag(); } }}
              />
              <Button type="button" variant="outline" size="sm" onClick={addHashtag} className="flex-shrink-0">
                Adicionar
              </Button>
            </div>
            {hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {hashtags.map(h => (
                  <span key={h} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">
                    {h}
                    <button onClick={() => setHashtags(prev => prev.filter(t => t !== h))} className="hover:text-destructive">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Assignee */}
          <div className="space-y-1.5">
            <Label htmlFor="content-assignee">Responsável (nome)</Label>
            <Input
              id="content-assignee"
              placeholder="Buscar por nome..."
              value={assigneeEmail}
              onChange={e => setAssigneeEmail(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">Deixe em branco para atribuir a você mesmo.</p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Criando...' : 'Criar conteúdo'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateContentDialog;
