import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { CONTENT_TYPE_LABELS, Platform, ContentType, ContentWithRelations } from '@/data/types';
import { PlatformSelector } from './PlatformIcons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { X, ImagePlus, Loader2, CalendarIcon, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EditContentDialogProps {
  content: ContentWithRelations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const universalContentTypes: ContentType[] = ['video', 'shorts', 'post', 'stories'];

const EditContentDialog = ({ content, open, onOpenChange }: EditContentDialogProps) => {
  const { updateContentFields, refetch } = useApp();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(content.title);
  const [platforms, setPlatforms] = useState<Platform[]>(
    Array.isArray(content.platform) ? content.platform : [content.platform]
  );
  const [contentType, setContentType] = useState<ContentType>(content.content_type as ContentType);
  const [copyText, setCopyText] = useState('');
  const [publishDate, setPublishDate] = useState<Date | undefined>(undefined);
  const [publishTime, setPublishTime] = useState('');
  const [uploading, setUploading] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(content.title);
      setPlatforms(Array.isArray(content.platform) ? content.platform : [content.platform]);
      setContentType(content.content_type as ContentType);
      setCopyText((content as any).copy_text ?? '');
      setPublishDate(content.publish_date ? new Date(content.publish_date + 'T12:00:00') : undefined);
      setPublishTime((content as any).publish_time ?? '');
      // Load media_urls or fallback to single media_url
      const urls = (content as any).media_urls;
      if (urls && Array.isArray(urls) && urls.length > 0) {
        setMediaUrls(urls);
      } else if (content.media_url) {
        setMediaUrls([content.media_url]);
      } else {
        setMediaUrls([]);
      }
    }
  }, [open, content]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    const newUrls: string[] = [];
    for (const file of files) {
      const ext = file.name.split('.').pop();
      const path = `${content.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('content-media').upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from('content-media').getPublicUrl(path);
        newUrls.push(data.publicUrl);
      }
    }
    setMediaUrls(prev => [...prev, ...newUrls]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setMediaUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title.trim() || platforms.length === 0) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha o título e selecione ao menos uma plataforma.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    await updateContentFields(content.id, {
      title: title.trim(),
      platform: platforms,
      content_type: contentType,
      copy_text: copyText.trim(),
      publish_date: publishDate ? format(publishDate, 'yyyy-MM-dd') : null,
      publish_time: publishTime || null,
      media_url: mediaUrls.length > 0 ? mediaUrls[0] : null,
      media_urls: mediaUrls,
    });
    await refetch();
    setLoading(false);
    toast({ title: 'Conteúdo atualizado!' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Conteúdo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-title">Título *</Label>
            <Input id="edit-title" value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Plataformas *</Label>
            <PlatformSelector selected={platforms} onChange={setPlatforms} size={40} />
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de conteúdo</Label>
            <Select value={contentType} onValueChange={v => setContentType(v as ContentType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {universalContentTypes.map(t => (
                  <SelectItem key={t} value={t}>{CONTENT_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Publish date & time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Data de publicação</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !publishDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {publishDate ? format(publishDate, 'dd MMM yyyy', { locale: ptBR }) : 'Selecionar'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={publishDate}
                    onSelect={setPublishDate}
                    locale={ptBR}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label>Horário</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={publishTime}
                  onChange={e => setPublishTime(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {/* Briefing (read-only) */}
          {content.description && (
            <div className="space-y-1.5">
              <Label>Briefing</Label>
              <p className="text-sm text-foreground whitespace-pre-wrap">{content.description}</p>
                {content.description}
              </div>
            </div>
          )}

          {/* Copy text */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-copy">Copy</Label>
            <Textarea
              id="edit-copy"
              placeholder="Escreva a copy da postagem..."
              value={copyText}
              onChange={e => setCopyText(e.target.value)}
              rows={4}
            />
          </div>

          {/* Media — multiple images */}
          <div className="space-y-2">
            <Label>Mídia</Label>
            {mediaUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {mediaUrls.map((url, i) => (
                  <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
                    <img src={url} alt={`Imagem ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
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
              disabled={uploading}
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
              {uploading ? 'Enviando...' : mediaUrls.length === 0 ? 'Anexar imagens' : 'Adicionar mais imagens'}
            </Button>
            <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileUpload} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditContentDialog;
