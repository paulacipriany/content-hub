import { useState, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CONTENT_TYPE_LABELS, Platform, ContentType } from '@/data/types';
import { PlatformSelector, getContentTypesForPlatforms } from './PlatformIcons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CalendarIcon, Plus, X, ImagePlus } from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [contentType, setContentType] = useState<ContentType>('feed');
  const [projectId, setProjectId] = useState(defaultProjectId ?? '');
  const [publishDate, setPublishDate] = useState<Date | undefined>();
  const [hashtagInput, setHashtagInput] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [assigneeEmail, setAssigneeEmail] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);

  const availableContentTypes = getContentTypesForPlatforms(platforms);

  // Reset content type if not available for selected platforms
  if (platforms.length > 0 && !availableContentTypes.includes(contentType) && availableContentTypes.length > 0) {
    setContentType(availableContentTypes[0]);
  }

  const reset = () => {
    setTitle('');
    setDescription('');
    setPlatforms([]);
    setContentType('feed');
    setProjectId(defaultProjectId ?? '');
    setPublishDate(undefined);
    setHashtagInput('');
    setHashtags([]);
    setAssigneeEmail('');
    setSelectedFiles([]);
    filePreviews.forEach(url => URL.revokeObjectURL(url));
    setFilePreviews([]);
  };

  const addHashtag = () => {
    const tag = hashtagInput.trim().startsWith('#') ? hashtagInput.trim() : `#${hashtagInput.trim()}`;
    if (tag.length > 1 && !hashtags.includes(tag)) {
      setHashtags(prev => [...prev, tag]);
      setHashtagInput('');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      toast({ title: 'Formato inválido', description: 'Selecione apenas imagens.', variant: 'destructive' });
      return;
    }

    setSelectedFiles(prev => [...prev, ...imageFiles]);
    const newPreviews = imageFiles.map(f => URL.createObjectURL(f));
    setFilePreviews(prev => [...prev, ...newPreviews]);

    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(filePreviews[index]);
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setFilePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (contentId: string): Promise<string | null> => {
    if (selectedFiles.length === 0) return null;

    const urls: string[] = [];
    for (const file of selectedFiles) {
      const ext = file.name.split('.').pop();
      const path = `${contentId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('content-media').upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from('content-media').getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }
    return urls.length > 0 ? urls[0] : null;
  };

  const handleSubmit = async () => {
    if (!title.trim() || !projectId || !user || platforms.length === 0) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha o título, selecione um cliente e ao menos uma plataforma.', variant: 'destructive' });
      return;
    }

    setLoading(true);

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

    // Determine actual content_type: if feed + multiple photos → carousel in DB
    const dbContentType = (contentType === 'feed' && selectedFiles.length > 1) ? 'carousel' : contentType;

    const { data: inserted, error } = await supabase.from('contents').insert({
      title: title.trim(),
      description: description.trim(),
      platform: platforms,
      content_type: dbContentType,
      project_id: projectId,
      publish_date: publishDate ? format(publishDate, 'yyyy-MM-dd') : null,
      hashtags,
      assignee_id: assigneeId ?? user.id,
      created_by: user.id,
      status: 'idea',
    } as any).select('id').single();

    if (error) {
      setLoading(false);
      toast({ title: 'Erro ao criar conteúdo', description: error.message, variant: 'destructive' });
      return;
    }

    // Upload files if any
    if (inserted && selectedFiles.length > 0) {
      const mediaUrl = await uploadFiles(inserted.id);
      if (mediaUrl) {
        await supabase.from('contents').update({ media_url: mediaUrl } as any).eq('id', inserted.id);
      }
    }

    setLoading(false);
    toast({ title: 'Conteúdo criado!' });
    reset();
    setOpen(false);
    await refetch();
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

          {/* Platforms */}
          <div className="space-y-2">
            <Label>Plataformas *</Label>
            <PlatformSelector selected={platforms} onChange={setPlatforms} size={40} />
            {platforms.length === 0 && (
              <p className="text-[11px] text-muted-foreground">Selecione ao menos uma plataforma.</p>
            )}
          </div>

          {/* Content Type - only shows after platform selection */}
          {platforms.length > 0 && (
            <div className="space-y-1.5">
              <Label>Tipo de conteúdo</Label>
              <Select value={contentType} onValueChange={v => setContentType(v as ContentType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableContentTypes.map(t => (
                    <SelectItem key={t} value={t}>{CONTENT_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Photo upload - visible when content type is feed */}
          {contentType === 'feed' && platforms.length > 0 && (
            <div className="space-y-2">
              <Label>Fotos</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
              
              {selectedFiles.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {filePreviews.map((url, i) => (
                    <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
                      <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus size={16} />
                {selectedFiles.length === 0 ? 'Selecionar fotos' : 'Adicionar mais fotos'}
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Selecione uma foto para post único ou várias para carrossel.
              </p>
            </div>
          )}

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
