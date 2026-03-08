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
import { X, ImagePlus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  const [briefing, setBriefing] = useState(content.description ?? '');
  const [platforms, setPlatforms] = useState<Platform[]>(
    Array.isArray(content.platform) ? content.platform : [content.platform]
  );
  const [contentType, setContentType] = useState<ContentType>(content.content_type as ContentType);
  const [uploading, setUploading] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | null>(content.media_url ?? null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(content.title);
      setBriefing(content.description ?? '');
      setPlatforms(Array.isArray(content.platform) ? content.platform : [content.platform]);
      setContentType(content.content_type as ContentType);
      setMediaUrl(content.media_url ?? null);
    }
  }, [open, content]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${content.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('content-media').upload(path, file);
    if (!error) {
      const { data } = supabase.storage.from('content-media').getPublicUrl(path);
      setMediaUrl(data.publicUrl);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!title.trim() || platforms.length === 0) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha o título e selecione ao menos uma plataforma.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    await updateContentFields(content.id, {
      title: title.trim(),
      description: briefing.trim(),
      platform: platforms,
      content_type: contentType,
      media_url: mediaUrl,
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

          <div className="space-y-2">
            <Label htmlFor="edit-briefing">Briefing</Label>
            <Textarea
              id="edit-briefing"
              placeholder="Descreva o briefing do conteúdo..."
              value={briefing}
              onChange={e => setBriefing(e.target.value)}
              rows={4}
            />

            {mediaUrl ? (
              <div className="relative group rounded-lg overflow-hidden border border-border max-w-full">
                <img src={mediaUrl} alt="Mídia" className="w-full max-h-48 object-cover" />
                <button
                  type="button"
                  onClick={() => setMediaUrl(null)}
                  className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
                {uploading ? 'Enviando...' : 'Anexar imagem'}
              </Button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileUpload} />
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
