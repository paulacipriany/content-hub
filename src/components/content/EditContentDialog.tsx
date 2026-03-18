import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { CONTENT_TYPE_LABELS, Platform, ContentType, ContentWithRelations, VISIBLE_CONTENT_TYPES } from '@/data/types';
import { PlatformSelector, getFilteredPlatformsForType } from './PlatformIcons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, ImagePlus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';
import RichTextEditor from './RichTextEditor';
import ApproverSelector from './ApproverSelector';

interface EditContentDialogProps {
  content: ContentWithRelations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const universalContentTypes = VISIBLE_CONTENT_TYPES;

const EditContentDialog = ({ content, open, onOpenChange }: EditContentDialogProps) => {
  const { updateContentFields, refetch, projects } = useApp();
  const { user } = useAuth();
  const { toast } = useToast();
  const { confirmDelete, ConfirmDialog } = useConfirmDelete();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(content.title);
  const [projectId, setProjectId] = useState(content.project_id || '');
  const [platforms, setPlatforms] = useState<Platform[]>(
    Array.isArray(content.platform) ? content.platform : [content.platform]
  );
  const [contentType, setContentType] = useState<ContentType>(content.content_type as ContentType);
  const [briefing, setBriefing] = useState(content.description || '');
  const [approverIds, setApproverIds] = useState<string[]>([]);
  
  const [briefingImages, setBriefingImages] = useState<string[]>(content.briefing_images || []);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(content.title);
      setProjectId(content.project_id || '');
      setPlatforms(Array.isArray(content.platform) ? content.platform : [content.platform]);
      setContentType(content.content_type as ContentType);
      setBriefing(content.description || '');
      setBriefingImages(content.briefing_images || []);
      setSelectedFiles([]);
      setFilePreviews([]);
      
      // Fetch approvers
      const fetchApprovers = async () => {
        const { data, error } = await supabase
          .from('content_approvers' as any)
          .select('user_id')
          .eq('content_id', content.id);
        
        if (!error && data) {
          setApproverIds(data.map((a: any) => a.user_id));
        }
      };
      
      fetchApprovers();
    }
  }, [open, content]);

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

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeNewFile = (index: number) => {
    confirmDelete(() => {
      URL.revokeObjectURL(filePreviews[index]);
      setSelectedFiles(prev => prev.filter((_, i) => i !== index));
      setFilePreviews(prev => prev.filter((_, i) => i !== index));
    }, 'esta imagem');
  };

  const removeExistingBriefingImage = (index: number) => {
    confirmDelete(() => {
      setBriefingImages(prev => prev.filter((_, i) => i !== index));
    }, 'esta imagem');
  };

  const uploadFiles = async (contentId: string): Promise<string[]> => {
    if (selectedFiles.length === 0 || !user) return [];

    const urls: string[] = [];
    for (const file of selectedFiles) {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${contentId}/briefing/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('content-media').upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from('content-media').getPublicUrl(path);
        urls.push(data.publicUrl);
      } else {
        console.error('Upload error for file:', file.name, error);
        toast({ title: 'Erro no upload', description: `Erro ao enviar ${file.name}: ${error.message}`, variant: 'destructive' });
      }
    }
    return urls;
  };

  const handleSave = async () => {
    if (!title.trim() || !projectId || platforms.length === 0 || !contentType) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha o título, selecione um cliente, tipo de conteúdo e ao menos uma plataforma.', variant: 'destructive' });
      return;
    }
    
    setLoading(true);

    // 1. Upload new briefing images
    const newBriefingImageUrls = await uploadFiles(content.id);
    const updatedBriefingImages = [...briefingImages, ...newBriefingImageUrls];

    // 2. Update content fields
    await updateContentFields(content.id, {
      title: title.trim(),
      project_id: projectId,
      platform: platforms,
      content_type: contentType,
      description: briefing,
      briefing_images: updatedBriefingImages,
    });

    // 3. Update approvers (delete and re-insert for simplicity)
    await supabase.from('content_approvers' as any).delete().eq('content_id', content.id);
    if (approverIds.length > 0) {
      await supabase.from('content_approvers' as any).insert(
        approverIds.map(userId => ({
          content_id: content.id,
          user_id: userId,
        }))
      );
    }

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

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-title">Título *</Label>
            <Input id="edit-title" value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          {/* Content Type */}
          <div className="space-y-1.5">
            <Label>Tipo de conteúdo *</Label>
            <Select 
              value={contentType} 
              onValueChange={v => {
                setContentType(v as ContentType);
                setPlatforms([]);
              }}
            >
              <SelectTrigger><SelectValue placeholder="Selecione o tipo de conteúdo" /></SelectTrigger>
              <SelectContent>
                {universalContentTypes.map(t => (
                  <SelectItem key={t} value={t}>{CONTENT_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Platforms */}
          <div className="space-y-2">
            <Label>Plataformas *</Label>
            <PlatformSelector 
              selected={platforms} 
              onChange={setPlatforms} 
              size={40} 
              availablePlatforms={getFilteredPlatformsForType(
                contentType, 
                projects.find(p => p.id === projectId)?.platforms as Platform[]
              )}
            />
          </div>

          {/* Approvers */}
          <ApproverSelector
            selectedApprovers={approverIds}
            onChange={setApproverIds}
            label="Aprovadores"
            projectId={projectId}
          />

          {/* Briefing — Rich Text */}
          <div className="space-y-2">
            <Label>Briefing</Label>
            <RichTextEditor
              content={briefing}
              onChange={setBriefing}
            />

            {/* Briefing Images */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />

            {(briefingImages.length > 0 || filePreviews.length > 0) && (
              <div className="grid grid-cols-3 gap-2">
                {/* Existing Images */}
                {briefingImages.map((url, i) => (
                  <div key={`existing-${i}`} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
                    <img src={url} alt={`Existing ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeExistingBriefingImage(i)}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {/* New Image Previews */}
                {filePreviews.map((url, i) => (
                  <div key={`new-${i}`} className="relative group aspect-square rounded-lg overflow-hidden border border-border ring-2 ring-primary ring-opacity-50">
                    <img src={url} alt={`New ${i + 1}`} className="w-full h-full object-cover opacity-70" />
                    <button
                      type="button"
                      onClick={() => removeNewFile(i)}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                    >
                      <X size={12} />
                    </button>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] bg-black/50 text-white px-1 rounded">Novo</span>
                    </div>
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
              {(briefingImages.length === 0 && selectedFiles.length === 0) ? 'Anexar imagens ao briefing' : 'Adicionar mais imagens'}
            </Button>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
      <ConfirmDialog />
    </Dialog>
  );
};

export default EditContentDialog;
