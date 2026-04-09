import { X, MessageSquare, CheckSquare, Calendar as CalIcon, User, Send, Check, Pencil, Eye, ImagePlus, Trash2, Loader2, Clock, Plus, UserCheck, GripVertical, Copy, Download } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useToast } from '@/hooks/use-toast';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';
import RichTextEditor from './RichTextEditor';
import AssigneeSelector from './AssigneeSelector';
import ApproverSelector from './ApproverSelector';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { STATUS_LABELS, STATUS_COLORS, PLATFORM_LABELS, CONTENT_TYPE_LABELS, WorkflowStatus, Platform, ContentType, VISIBLE_CONTENT_TYPES } from '@/data/types';
import { platformIcon, PlatformSelector, getFilteredPlatformsForType } from './PlatformIcons';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef, useCallback } from 'react';
import PostPreview from './PostPreview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { recordApproval } from '@/lib/approvalUtils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Sortable media item for drag-and-drop reordering
const SortableMediaItem = ({ url, index, onRemove, onLightbox }: { url: string; index: number; onRemove: (i: number) => void; onLightbox: (url: string) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: url + '__' + index });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 10 : undefined };
  const isVideo = url.match(/\.(mp4|webm|mov)$/i);

  return (
    <div ref={setNodeRef} style={style} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
      {isVideo ? (
        <video src={url} controls className="w-full h-full object-cover" />
      ) : (
        <img src={url} alt={`Mídia ${index + 1}`} className="w-full h-full object-cover cursor-pointer" onClick={() => onLightbox(url)} />
      )}
      <div {...attributes} {...listeners} className="absolute top-1 left-1 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
        <GripVertical size={12} />
      </div>
      <button
        onClick={() => onRemove(index)}
        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 size={10} />
      </button>
    </div>
  );
};

const allStatuses: WorkflowStatus[] = ['idea', 'production', 'review', 'approval-client', 'scheduled', 'published'];
const allPlatforms: Platform[] = ['instagram', 'facebook', 'linkedin', 'tiktok', 'youtube'];
const allContentTypes = VISIBLE_CONTENT_TYPES;

function useAutoSave(contentId: string | undefined, field: string, value: string, updateFn: (id: string, fields: any) => Promise<void>) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (!contentId || value === prevValueRef.current) return;
    prevValueRef.current = value;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      updateFn(contentId, { [field]: value });
    }, 600);

    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [value, contentId, field, updateFn]);
}

const ContentPanel = () => {
  const { selectedContent, setSelectedContent, updateContentStatus, updateContentFields } = useApp();
  const { user, profile, role } = useAuth();
  const { toast } = useToast();
  const { confirmDelete, ConfirmDialog } = useConfirmDelete();
  const isClient = role === 'client';
  const isIdeaBank = selectedContent?.status === 'idea-bank';
  const isClientApproval = isClient && selectedContent?.status === 'approval-client';
  const isReview = selectedContent?.status === 'review';
  const isProduction = selectedContent?.status === 'production';
  const isClientRequest = selectedContent?.status === 'client-request';
  const [newComment, setNewComment] = useState('');
  const [commentImageUrl, setCommentImageUrl] = useState<string | null>(null);
  const [commentUploading, setCommentUploading] = useState(false);
  const commentFileRef = useRef<HTMLInputElement>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [newCheckItem, setNewCheckItem] = useState('');
  const [approvers, setApprovers] = useState<{ user_id: string; display_name: string | null }[]>([]);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [previewPlatform, setPreviewPlatform] = useState<Platform>('instagram');

  // Editable local state
  const [editTitle, setEditTitle] = useState('');
  const [editCopyText, setEditCopyText] = useState('');
  const [editCopyTexts, setEditCopyTexts] = useState<Record<string, string>>({});
  const [perPlatformCopy, setPerPlatformCopy] = useState(false);
  const [editPublishTime, setEditPublishTime] = useState('');
  const [uploading, setUploading] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [briefingImages, setBriefingImages] = useState<string[]>([]);
  const [briefingUploading, setBriefingUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const briefingFileInputRef = useRef<HTMLInputElement>(null);
  const [editBriefing, setEditBriefing] = useState('');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState(true);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const mediaSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const savedSnapshotRef = useRef<string>('');
  const [userAlreadyApproved, setUserAlreadyApproved] = useState(false);
  const [briefingOpen, setBriefingOpen] = useState(true);
  const [urlToFilename, setUrlToFilename] = useState<Record<string, string>>({});
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  // Helper to get current draft fingerprint
  const getDraftFingerprint = useCallback(() => {
    return JSON.stringify({ editTitle, editCopyText, editCopyTexts, editPublishTime, mediaUrls, briefingImages, editBriefing, thumbnailUrl });
  }, [editTitle, editCopyText, editCopyTexts, editPublishTime, mediaUrls, briefingImages, editBriefing, thumbnailUrl]);

  // Mark dirty when fields change
  useEffect(() => {
    if (savedSnapshotRef.current && getDraftFingerprint() !== savedSnapshotRef.current) {
      setDraftSaved(false);
    }
  }, [getDraftFingerprint]);

  // Sync local state when selected content changes
  useEffect(() => {
    if (!selectedContent) return;
    setEditTitle(selectedContent.title);
    setEditBriefing(selectedContent.description ?? '');
    setEditCopyText(selectedContent.copy_text ?? '');
    const texts = selectedContent.copy_texts;
    const parsedTexts = texts && typeof texts === 'object' ? (texts as Record<string, string>) : {};
    setEditCopyTexts(parsedTexts);
    setPerPlatformCopy(Object.keys(parsedTexts).length > 0);
    setEditPublishTime(selectedContent.publish_time ?? '');
    const urls = selectedContent.media_urls;
    if (urls && Array.isArray(urls) && urls.length > 0) {
      setMediaUrls(urls);
    } else if (selectedContent.media_url) {
      setMediaUrls([selectedContent.media_url]);
    } else {
      setMediaUrls([]);
    }
    const bImages = selectedContent.briefing_images;
    setBriefingImages(bImages && Array.isArray(bImages) ? bImages : []);
    setDraftSaved(true);
    if (selectedContent.platform && selectedContent.platform.length > 0) {
      setPreviewPlatform(selectedContent.platform[0]);
    }
    setBriefingOpen(!(selectedContent.status === 'production' || selectedContent.status === 'review' || selectedContent.status === 'approval-client' || selectedContent.status === 'scheduled'));
    setThumbnailUrl((selectedContent as any).thumbnail_url ?? null);
    
    // Set snapshot after a tick so state is updated
    setTimeout(() => {
      savedSnapshotRef.current = JSON.stringify({
        editTitle: selectedContent.title,
        editCopyText: selectedContent.copy_text ?? '',
        editCopyTexts: (texts && typeof texts === 'object' ? texts : {}),
        editPublishTime: selectedContent.publish_time ?? '',
        mediaUrls: urls && Array.isArray(urls) && urls.length > 0 ? urls : selectedContent.media_url ? [selectedContent.media_url] : [],
        briefingImages: bImages && Array.isArray(bImages) ? bImages : [],
        editBriefing: selectedContent.description ?? '',
        thumbnailUrl: (selectedContent as any).thumbnail_url ?? null
      });
    }, 0);
  }, [selectedContent?.id]);

  // REMOVED AUTO-SAVE hooks
  // useAutoSave(selectedContent?.id, 'title', editTitle, updateContentFields);
  // useAutoSave(selectedContent?.id, 'description', editBriefing, updateContentFields);

  useEffect(() => {
    if (!selectedContent) return;
    supabase
      .from('comments')
      .select('*')
      .eq('content_id', selectedContent.id)
      .order('created_at', { ascending: false })
      .then(async ({ data }) => {
        if (!data) return setComments([]);
        const userIds = [...new Set(data.map(c => c.user_id))];
        const { data: profiles } = await supabase.from('profiles').select('*').in('user_id', userIds);
        const pMap = new Map((profiles ?? []).map(p => [p.user_id, p]));
        setComments(data.map(c => ({ ...c, profile: pMap.get(c.user_id) })));
      });
    supabase
      .from('checklist_items')
      .select('*')
      .eq('content_id', selectedContent.id)
      .order('sort_order')
      .then(({ data }) => setChecklist(data ?? []));
    // Fetch approvers
    supabase
      .from('content_approvers' as any)
      .select('user_id')
      .eq('content_id', selectedContent.id)
      .then(async ({ data }: any) => {
        if (!data || data.length === 0) { setApprovers([]); return; }
        const userIds = data.map((a: any) => a.user_id);
        const { data: profiles } = await supabase.from('profiles').select('user_id, display_name').in('user_id', userIds);
        setApprovers(profiles ?? []);
      });
    // Check if current user already approved
    if (user) {
      supabase
        .from('approvals')
        .select('id')
        .eq('content_id', selectedContent.id)
        .eq('reviewer_id', user.id)
        .eq('decision', 'approved')
        .then(({ data }) => setUserAlreadyApproved((data ?? []).length > 0));
    } else {
      setUserAlreadyApproved(false);
    }
  }, [selectedContent?.id, user?.id]);

  if (!selectedContent) return null;

  const currentIdx = allStatuses.indexOf(selectedContent.status as WorkflowStatus);
  const canAdvance = currentIdx < allStatuses.length - 1;
  const assigneeName = selectedContent.assignee_profile?.display_name ?? 'Sem responsável';

  const handleAddComment = async () => {
    if ((!newComment.trim() && !commentImageUrl) || !user) return;
    const insertData: any = {
      content_id: selectedContent.id,
      user_id: user.id,
      text: newComment.trim() || '',
    };
    if (commentImageUrl) insertData.image_url = commentImageUrl;
    await supabase.from('comments').insert(insertData);
    setComments(prev => [...prev, {
      id: crypto.randomUUID(),
      content_id: selectedContent.id,
      user_id: user.id,
      text: newComment.trim() || '',
      image_url: commentImageUrl,
      created_at: new Date().toISOString(),
      profile: { display_name: profile?.display_name },
    }]);
    setNewComment('');
    setCommentImageUrl(null);
  };

  const handleCommentImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedContent) return;
    setCommentUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${selectedContent.id}/comments/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('content-media').upload(path, file);
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('content-media').getPublicUrl(path);
        setCommentImageUrl(publicUrl);
      }
    } catch (err) {
      console.error('Comment image upload error:', err);
    } finally {
      setCommentUploading(false);
      if (commentFileRef.current) commentFileRef.current.value = '';
    }
  };

  const toggleCheckItem = async (itemId: string, done: boolean) => {
    await supabase.from('checklist_items').update({ done: !done }).eq('id', itemId);
    setChecklist(prev => prev.map(i => i.id === itemId ? { ...i, done: !done } : i));
  };

  const handlePlatformChange = (platforms: Platform[]) => {
    updateContentFields(selectedContent.id, { platform: platforms });
  };

  const handleTypeChange = (value: string) => {
    updateContentFields(selectedContent.id, { content_type: value as ContentType });
  };

  const handleDateChange = (date: Date | undefined) => {
    const dateStr = date ? format(date, 'yyyy-MM-dd') : null;
    updateContentFields(selectedContent.id, { publish_date: dateStr });
  };

  const handleTimeChange = (time: string) => {
    setEditPublishTime(time);
    updateContentFields(selectedContent.id, { publish_time: time || null });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let files = Array.from(e.target.files || []);
    if (files.length === 0 || !user || !selectedContent) return;
    const isVideoType = selectedContent.content_type === 'video' || selectedContent.content_type === 'shorts' || selectedContent.content_type === 'reels';
    const isSingleFile = selectedContent.content_type === 'post' || isVideoType;
    if (isSingleFile) {
      files = [files[0]];
    }
    
    setUploading(true);
    try {
      const newUrls: string[] = [];
      for (const file of files) {
        const ext = file.name.split('.').pop();
        const path = `${user.id}/${selectedContent.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from('content-media').upload(path, file);
        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from('content-media').getPublicUrl(path);
          newUrls.push(publicUrl);
        } else {
          console.error('Upload error for media:', error);
          toast({ 
            title: 'Erro no upload', 
            description: `Não foi possível enviar a mídia ${file.name}: ${error.message}`, 
            variant: 'destructive' 
          });
        }
      }
      const updatedUrls = isSingleFile ? [newUrls[0]] : [...mediaUrls, ...newUrls];
      setMediaUrls(updatedUrls);
    } catch (err) {
      console.error('Upload error:', err);
      toast({ title: 'Erro inesperado', description: 'Erro ao processar o upload da mídia.', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveMedia = async (index: number) => {
    confirmDelete(async () => {
      const updatedUrls = mediaUrls.filter((_, i) => i !== index);
      setMediaUrls(updatedUrls);
    }, 'esta mídia');
  };

  const handleRemoveAllMedia = async () => {
    confirmDelete(async () => {
      setMediaUrls([]);
    }, 'todas as mídias');
  };

  const handleRemoveAllBriefingImages = async () => {
    confirmDelete(async () => {
      setBriefingImages([]);
    }, 'todas as imagens do briefing');
  };

  const handleBriefingImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !user || !selectedContent) return;
    setBriefingUploading(true);
    try {
      const newUrls: string[] = [];
      for (const file of files) {
        const ext = file.name.split('.').pop();
        const path = `${user.id}/${selectedContent.id}/briefing/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from('content-media').upload(path, file);
        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from('content-media').getPublicUrl(path);
          newUrls.push(publicUrl);
        } else {
          console.error('Upload error for briefing image:', error);
          toast({ 
            title: 'Erro no upload', 
            description: `Não foi possível enviar a imagem ${file.name}: ${error.message}`, 
            variant: 'destructive' 
          });
        }
      }
      
      if (newUrls.length > 0) {
        const updated = [...briefingImages, ...newUrls];
        setBriefingImages(updated);
        toast({ title: 'Imagens enviadas', description: `${newUrls.length} imagens adicionadas ao briefing.` });
      }
    } catch (err) {
      console.error('Briefing image upload error:', err);
      toast({ title: 'Erro inesperado', description: 'Ocorreu um erro ao processar o upload das imagens.', variant: 'destructive' });
    } finally {
      setBriefingUploading(false);
      if (briefingFileInputRef.current) briefingFileInputRef.current.value = '';
    }
  };

  const handleRemoveBriefingImage = async (index: number) => {
    confirmDelete(async () => {
      const updated = briefingImages.filter((_, i) => i !== index);
      setBriefingImages(updated);
    }, 'esta imagem do briefing');
  };

  const handleSaveDraft = async () => {
    await updateContentFields(selectedContent.id, {
      title: editTitle,
      description: editBriefing,
      copy_text: editCopyText,
      copy_texts: editCopyTexts,
      publish_time: editPublishTime || null,
      media_url: mediaUrls[0] ?? null,
      media_urls: mediaUrls,
      briefing_images: briefingImages,
      thumbnail_url: thumbnailUrl,
    });
    savedSnapshotRef.current = getDraftFingerprint();
    setDraftSaved(true);
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !selectedContent) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${selectedContent.id}/thumbnail/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('content-media').upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('content-media').getPublicUrl(path);
      setThumbnailUrl(publicUrl);
    } catch (err: any) {
      console.error('Thumbnail upload error:', err);
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
    }
  };

  const handleRemoveThumbnail = async () => {
    confirmDelete(async () => {
      setThumbnailUrl(null);
    }, 'a capa do vídeo');
  };

  const handleClose = () => {
    if (!draftSaved && !isClient) {
      setShowUnsavedDialog(true);
    } else {
      setSelectedContent(null);
    }
  };

  const handleSaveAndClose = async () => {
    await handleSaveDraft();
    setShowUnsavedDialog(false);
    setSelectedContent(null);
  };

  const handleDiscardAndClose = () => {
    setShowUnsavedDialog(false);
    setSelectedContent(null);
  };

  const handleCopyText = () => {
    let text = editCopyText;
    if (perPlatformCopy && editCopyTexts[previewPlatform]) {
      text = editCopyTexts[previewPlatform];
    }
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!', description: 'Texto da copy copiado para a área de transferência.' });
  };

  const handleDownloadMedia = async () => {
    if (mediaUrls.length === 0) return;
    toast({ title: 'Baixando...', description: 'As mídias estão sendo baixadas.' });
    
    for (const [i, url] of mediaUrls.entries()) {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        // Try to keep original extension
        const filename = url.split('/').pop()?.split('?')[0] || `media-${i + 1}`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
        // Small delay to prevent browser blocking multiple downloads
        if (mediaUrls.length > 1) await new Promise(r => setTimeout(r, 300));
      } catch (err) {
        console.error('Download error:', err);
        window.open(url, '_blank'); // Fallback
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 h-14 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <X size={18} />
          </button>
          
          {isClient ? (
            <div className="flex items-center gap-2 px-2 overflow-hidden">
              <span className="font-semibold text-base text-foreground truncate">{editTitle}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-secondary text-secondary-foreground border border-border/50 whitespace-nowrap">
                {CONTENT_TYPE_LABELS[selectedContent.content_type as ContentType]}
              </span>
              {!isIdeaBank && (
                <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium text-primary-foreground flex-shrink-0", STATUS_COLORS[selectedContent.status as WorkflowStatus])}>
                  {STATUS_LABELS[selectedContent.status as WorkflowStatus]}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-2 flex-1 min-w-0 overflow-hidden">
              <div className="relative max-w-full flex-shrink-0 overflow-hidden group min-w-[200px]">
                {/* Hidden span dynamically sizes the relative container to perfectly match the input width! */}
                <span className="font-semibold text-base px-2 opacity-0 whitespace-pre pointer-events-none inline-block min-w-full" aria-hidden="true">
                  {editTitle || "Título do conteúdo"}
                </span>
                <input
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="absolute inset-0 w-full h-full font-semibold text-base text-foreground bg-transparent border-none outline-none truncate focus:ring-0 hover:bg-secondary/50 focus:bg-secondary rounded px-2 transition-colors"
                  placeholder="Título do conteúdo"
                />
              </div>
              
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-secondary text-secondary-foreground border border-border/50 whitespace-nowrap flex-shrink-0">
                {CONTENT_TYPE_LABELS[selectedContent.content_type as ContentType]}
              </span>
              {!isIdeaBank && (
                <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium text-primary-foreground flex-shrink-0", STATUS_COLORS[selectedContent.status as WorkflowStatus])}>
                  {STATUS_LABELS[selectedContent.status as WorkflowStatus]}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2">
          {isClient ? (
            isClientApproval ? (
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className={cn(
                        (userAlreadyApproved || (!newComment.trim() && !commentImageUrl && comments.length === 0)) ? "cursor-help" : ""
                      )}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive border-destructive/30 hover:bg-destructive/10"
                          disabled={userAlreadyApproved || (!newComment.trim() && !commentImageUrl && comments.length === 0)}
                          onClick={async () => {
                            if (!user) return;
                            if (newComment.trim() || commentImageUrl) {
                              const insertData: any = { content_id: selectedContent.id, user_id: user.id, text: newComment.trim() || '' };
                              if (commentImageUrl) insertData.image_url = commentImageUrl;
                              await supabase.from('comments').insert(insertData);
                            }
                            await updateContentStatus(selectedContent.id, 'review');
                            setNewComment('');
                            setCommentImageUrl(null);
                            setSelectedContent(null);
                          }}
                        >
                          Enviar para ajustes
                        </Button>
                      </div>
                    </TooltipTrigger>
                    {(userAlreadyApproved || (!newComment.trim() && !commentImageUrl && comments.length === 0)) && (
                      <TooltipContent>
                        <p>{userAlreadyApproved ? 'Você já aprovou este conteúdo' : 'É necessário deixar um comentário ou anexo para enviar o post para ajustes'}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
                {canAdvance && (
                  <Button
                    size="sm"
                    disabled={userAlreadyApproved}
                    className={cn(
                      "font-semibold",
                      userAlreadyApproved ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
                    )}
                    onClick={async () => {
                      if (!user) return;
                      const { allApproved, error } = await recordApproval(selectedContent.id, user.id);
                      if (error) {
                        toast({ title: 'Aviso', description: error, variant: 'destructive' });
                        return;
                      }
                      setUserAlreadyApproved(true);
                      if (allApproved) {
                        await updateContentStatus(selectedContent.id, allStatuses[currentIdx + 1]);
                        setSelectedContent(null);
                      } else {
                        toast({ title: 'Aprovação registrada', description: 'Aguardando os demais aprovadores.' });
                        setSelectedContent(null);
                      }
                    }}
                  >
                    {userAlreadyApproved ? 'Já aprovado' : 'Aprovar'}
                  </Button>
                )}
              </>
            ) : (
              <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium text-primary-foreground flex-shrink-0", STATUS_COLORS[selectedContent.status as WorkflowStatus])}>
                {STATUS_LABELS[selectedContent.status as WorkflowStatus]}
              </span>
            )
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={draftSaved}
                onClick={handleSaveDraft}
              >
                {draftSaved ? (
                  <><Check size={14} className="mr-1" /> Salvo</>
                ) : (
                  'Salvar rascunho'
                )}
              </Button>
              {isIdeaBank ? (
                <Button
                  size="sm"
                  className="bg-primary text-primary-foreground"
                  onClick={() => {
                    updateContentStatus(selectedContent.id, 'idea');
                    setSelectedContent(null);
                  }}
                >
                  Enviar para Workflow
                </Button>
              ) : canAdvance && (
                <>
                  {selectedContent.status === 'approval-client' && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        await updateContentStatus(selectedContent.id, 'review');
                        setSelectedContent(null);
                      }}
                    >
                      Solicitar ajustes
                    </Button>
                  )}
                  <Button
                    size="sm"
                    disabled={selectedContent.status === 'approval-client' && userAlreadyApproved}
                    className={cn(
                      "font-semibold",
                      (selectedContent.status === 'approval-client' && userAlreadyApproved) ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
                    )}
                    onClick={async () => { 
                      try {
                        // Block advancing to review without media
                        if (selectedContent.status === 'production' && mediaUrls.length === 0) {
                          toast({ title: 'Mídia obrigatória', description: 'Adicione pelo menos uma mídia antes de enviar para revisão.', variant: 'destructive' });
                          return;
                        }
                        // Multi-approver check for approval-client
                        if (selectedContent.status === 'approval-client' && user) {
                          const { allApproved, error } = await recordApproval(selectedContent.id, user.id);
                          if (error) {
                            toast({ title: 'Aviso', description: error, variant: 'destructive' });
                            return;
                          }
                          if (!allApproved) {
                            toast({ title: 'Aprovação registrada', description: 'Aguardando os demais aprovadores.' });
                            setSelectedContent(null);
                            return;
                          }
                        }
                        await updateContentStatus(selectedContent.id, allStatuses[currentIdx + 1]); 
                        if (selectedContent.status === 'idea' || selectedContent.status === 'production' || selectedContent.status === 'review' || selectedContent.status === 'approval-client') setSelectedContent(null); 
                      } catch (error) {
                        toast({ 
                          title: 'Erro', 
                          description: error instanceof Error ? error.message : 'Erro ao atualizar status', 
                          variant: 'destructive' 
                        });
                      }
                    }}
                  >
                    {selectedContent.status === 'approval-client' && userAlreadyApproved ? 'Já aprovado' : selectedContent.status === 'idea' ? 'Enviar para produção' : selectedContent.status === 'production' ? 'Enviar para revisão' : allStatuses[currentIdx + 1] === 'approval-client' ? 'Enviar para aprovação' : allStatuses[currentIdx + 1] === 'scheduled' ? 'Aprovar' : `Avançar para ${STATUS_LABELS[allStatuses[currentIdx + 1]]}`}
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left column — Edit (or Preview for client) */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6 lg:p-10 space-y-5">
          {/* Status — hidden always (managed via workflow buttons) */}

          {/* Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm opacity-0 h-0 overflow-hidden">
              <span className="text-muted-foreground w-24 flex-shrink-0">Plataformas</span>
              {isClient ? (
                <div className="flex items-center gap-1">{platformIcon(selectedContent.platform, 22)}</div>
              ) : (
                <PlatformSelector
                  selected={Array.isArray(selectedContent.platform) ? selectedContent.platform : [selectedContent.platform]}
                  onChange={handlePlatformChange}
                  size={28}
                  availablePlatforms={getFilteredPlatformsForType(
                    selectedContent.content_type as ContentType, 
                    (selectedContent as any).project?.platforms as Platform[]
                  )}
                />
              )}
            </div>
            {/* Tipo — hidden (moved to header tag) */}
            {!isClient && (
              <div className="flex items-center gap-3 text-sm opacity-0 h-0 overflow-hidden">
                <span className="text-muted-foreground w-24 flex-shrink-0">Tipo</span>
                <span className="text-foreground text-xs">{CONTENT_TYPE_LABELS[selectedContent.content_type as ContentType]}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground w-24 flex-shrink-0">Publicação</span>
              {isClient ? (
                <div className="flex items-center gap-3 text-foreground text-xs">
                  <span className="flex items-center gap-1.5">
                    <CalIcon size={12} className="text-muted-foreground" />
                    {selectedContent.publish_date
                      ? format(new Date(selectedContent.publish_date + 'T12:00:00'), 'dd MMM yyyy', { locale: ptBR })
                      : 'Não definida'}
                  </span>
                  {editPublishTime && (
                    <span className="flex items-center gap-1.5 border-l border-border pl-3 ml-1">
                      <Clock size={12} className="text-muted-foreground" />
                      {editPublishTime}
                    </span>
                  )}
                </div>
              ) : (
                <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                  <PopoverTrigger asChild>
                    <button className="h-8 px-3 text-xs rounded-md border border-input bg-background text-foreground hover:bg-accent flex items-center gap-2 flex-1 text-left">
                      <CalIcon size={12} className="text-muted-foreground" />
                      {selectedContent.publish_date
                        ? format(new Date(selectedContent.publish_date + 'T12:00:00'), 'dd MMM yyyy', { locale: ptBR })
                        : 'Selecionar data'}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedContent.publish_date ? new Date(selectedContent.publish_date + 'T12:00:00') : undefined}
                      onSelect={(d) => { handleDateChange(d); setDatePopoverOpen(false); }}
                      locale={ptBR}
                      className={cn("p-3 pointer-events-auto")}
                    />
                    {selectedContent.publish_date && (
                      <div className="p-2 border-t">
                        <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => { handleDateChange(undefined); setDatePopoverOpen(false); }}>Remover data</Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              )}
            </div>
            {!isIdeaBank && !isClient && (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground w-24 flex-shrink-0">Horário</span>
                {isClient ? (
                  <span className="text-foreground text-xs flex items-center gap-2">
                    <Clock size={12} className="text-muted-foreground" />
                    {editPublishTime || 'Não definido'}
                  </span>
                ) : (
                  <div className="relative flex-1">
                    <Clock size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="time"
                      value={editPublishTime}
                      onChange={e => handleTimeChange(e.target.value)}
                      className="h-8 w-full pl-8 pr-3 text-xs rounded-md border border-input bg-background text-foreground"
                    />
                  </div>
                )}
              </div>
            )}
            {!isIdeaBank && (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground w-24 flex-shrink-0">Responsável</span>
                {(role === 'admin' || role === 'moderator') ? (
                  <AssigneeSelector
                    currentAssigneeId={selectedContent.assignee_id}
                    assigneeName={assigneeName}
                    onChangeAssignee={async (userId) => {
                      await updateContentFields(selectedContent.id, { assignee_id: userId });
                    }}
                  />
                ) : (
                  <div className="flex items-center gap-2 h-8 px-3 text-xs rounded-md border border-input bg-background text-foreground flex-1">
                    <User size={12} className="text-muted-foreground" />
                    <span>{assigneeName}</span>
                  </div>
                )}
              </div>
            )}
            {/* Approvers — below Responsável */}
            {!isIdeaBank && (
              <div className="flex items-start gap-3 text-sm">
                <span className="text-muted-foreground w-24 flex-shrink-0 mt-1">Aprovadores</span>
                <div className="flex-1">
                  {selectedContent.status === 'idea' ? (
                    <ApproverSelector
                      selectedApprovers={approvers.map(a => a.user_id)}
                      onChange={async (newIds) => {
                        // Delete existing approvers
                        await supabase.from('content_approvers' as any).delete().eq('content_id', selectedContent.id);
                        // Insert new ones
                        if (newIds.length > 0) {
                          await supabase.from('content_approvers' as any).insert(
                            newIds.map(userId => ({ content_id: selectedContent.id, user_id: userId }))
                          );
                        }
                        // Refresh approvers
                        if (newIds.length > 0) {
                          const { data: profiles } = await supabase.from('profiles').select('user_id, display_name').in('user_id', newIds);
                          setApprovers(profiles ?? []);
                        } else {
                          setApprovers([]);
                        }
                      }}
                      projectId={selectedContent.project_id}
                    />
                  ) : approvers.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {approvers.map(a => (
                        <span key={a.user_id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-xs text-foreground">
                          <UserCheck size={10} className="text-muted-foreground" />
                          {a.display_name ?? 'Sem nome'}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Nenhum aprovador</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Briefing — rich editor for idea-bank, read-only otherwise, hidden in review */}
          {!isReview && ((isIdeaBank || selectedContent.status === 'idea') ? (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Briefing</label>
              <RichTextEditor
                key={selectedContent.id}
                content={selectedContent.description ?? ''}
                onChange={setEditBriefing}
                contentId={selectedContent.id}
              />
            </div>
          ) : selectedContent.description ? (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Briefing</label>
              <div
                className="text-sm text-foreground prose prose-sm max-w-none [&_img]:rounded-lg [&_img]:max-w-full [&_img]:my-2 [&_a]:text-primary [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: selectedContent.description }}
              />
            </div>
          ) : null)}

          {/* Briefing images — below briefing, for all modes, hidden in review */}
          {!isClient && !isReview && (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <ImagePlus size={12} />Imagens do briefing
              </label>
              {briefingImages.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {briefingImages.map((url, i) => (
                    <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
                      <img src={url} alt={`Briefing ${i + 1}`} className="w-full h-full object-cover cursor-pointer" onClick={() => setLightboxUrl(url)} />
                      {!isProduction && (
                        <button
                          onClick={() => handleRemoveBriefingImage(i)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={10} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {!isProduction && (
                <>
                  <button
                    onClick={() => briefingFileInputRef.current?.click()}
                    disabled={briefingUploading}
                    className="w-full max-w-sm h-20 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1.5 hover:border-primary/40 hover:bg-primary/5 transition-colors text-muted-foreground"
                  >
                    {briefingUploading ? (
                      <Loader2 size={18} className="animate-spin text-primary" />
                    ) : (
                      <>
                        <ImagePlus size={18} />
                        <span className="text-xs">{briefingImages.length === 0 ? 'Anexar imagens ao briefing' : 'Adicionar mais imagens'}</span>
                      </>
                    )}
                  </button>
                  <input
                    ref={briefingFileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleBriefingImageUpload}
                    className="hidden"
                  />
                </>
              )}
              {isProduction && briefingImages.length === 0 && (
                <p className="text-xs text-muted-foreground italic">Nenhuma imagem de briefing anexada.</p>
              )}
            </div>
          )}

          {/* Client view: space handled in right sidebar */}
          {isIdeaBank ? null : isClient ? (
            <div className="py-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground italic">Role para a direita para ver o preview do post e os comentários.</p>
            </div>
          ) : (
            <>
              {/* Copy text (editable) — hidden for stories */}
              {selectedContent.content_type !== 'stories' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Copy</label>
                  <button
                    onClick={() => {
                      const next = !perPlatformCopy;
                      setPerPlatformCopy(next);
                      if (!next) {
                        setEditCopyTexts({});
                        updateContentFields(selectedContent.id, { copy_texts: {} });
                      } else {
                        const platforms = Array.isArray(selectedContent.platform) ? selectedContent.platform : [selectedContent.platform];
                        const seeded: Record<string, string> = {};
                        platforms.forEach(p => { seeded[p] = editCopyText; });
                        setEditCopyTexts(seeded);
                        updateContentFields(selectedContent.id, { copy_texts: seeded });
                      }
                    }}
                    className={cn(
                      "text-[11px] font-medium px-2 py-0.5 rounded-full transition-colors",
                      perPlatformCopy ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                    )}
                  >
                    {perPlatformCopy ? '✓ Texto por rede' : 'Mesmo texto para todas'}
                  </button>
                </div>

                {perPlatformCopy ? (
                  <div className="space-y-3">
                    {(Array.isArray(selectedContent.platform) ? selectedContent.platform : [selectedContent.platform]).map(p => (
                      <div key={p}>
                        <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                          {platformIcon([p], 14)}
                          {PLATFORM_LABELS[p]}
                        </label>
                        <textarea
                          value={editCopyTexts[p] ?? ''}
                          onChange={e => {
                            const updated = { ...editCopyTexts, [p]: e.target.value };
                            setEditCopyTexts(updated);
                            updateContentFields(selectedContent.id, { copy_texts: updated });
                          }}
                          rows={3}
                          placeholder={`Copy para ${PLATFORM_LABELS[p]}...`}
                          className="w-full text-sm text-foreground bg-secondary rounded-lg p-3 outline-none resize-none focus:ring-2 focus:ring-ring/20 hover:bg-secondary/80 transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <textarea
                    value={editCopyText}
                    onChange={e => {
                      setEditCopyText(e.target.value);
                      updateContentFields(selectedContent.id, { copy_text: e.target.value });
                    }}
                    rows={5}
                    placeholder="Escreva a copy da postagem..."
                    className="w-full text-sm text-foreground bg-secondary rounded-lg p-3 outline-none resize-none focus:ring-2 focus:ring-ring/20 hover:bg-secondary/80 transition-colors"
                  />
                )}
              </div>
              )}

              {/* Media Upload */}
              <div className={cn("grid gap-6", (selectedContent.content_type === 'video' || selectedContent.content_type === 'shorts' || selectedContent.content_type === 'reels') ? "grid-cols-2" : "grid-cols-1")}>
                
                {/* Main Media Section */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 leading-none">
                      <ImagePlus size={12} />Mídia
                    </label>
                    {mediaUrls.length > 0 && (
                      <button
                        onClick={handleRemoveAllMedia}
                        className="text-[10px] text-destructive hover:underline flex items-center gap-1"
                      >
                        <Trash2 size={10} /> Excluir todas
                      </button>
                    )}
                  </div>
                  {mediaUrls.length > 0 && (
                    <DndContext
                      sensors={mediaSensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(event: DragEndEvent) => {
                        const { active, over } = event;
                        if (!over || active.id === over.id) return;
                        const oldIndex = mediaUrls.findIndex((u, i) => u + '__' + i === active.id);
                        const newIndex = mediaUrls.findIndex((u, i) => u + '__' + i === over.id);
                        if (oldIndex === -1 || newIndex === -1) return;
                        const reordered = arrayMove(mediaUrls, oldIndex, newIndex);
                        setMediaUrls(reordered);
                      }}
                    >
                      <SortableContext items={mediaUrls.map((u, i) => u + '__' + i)} strategy={rectSortingStrategy}>
                        <div className={cn("gap-2 mb-2", (selectedContent.content_type === 'video' || selectedContent.content_type === 'shorts' || selectedContent.content_type === 'reels') ? "flex flex-col" : "grid grid-cols-3")}>
                          {mediaUrls.map((url, i) => (
                            <div key={url + '__' + i} className={cn("relative rounded-md overflow-hidden bg-muted group", (selectedContent.content_type === 'video' || selectedContent.content_type === 'shorts' || selectedContent.content_type === 'reels') ? (selectedContent.content_type === 'video' ? 'w-full aspect-video' : 'w-full aspect-[9/16]') : 'w-24 h-24')}>
                              <SortableMediaItem url={url} index={i} onRemove={handleRemoveMedia} onLightbox={setLightboxUrl} />
                            </div>
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                  {!(
                    (selectedContent.content_type === 'post' || selectedContent.content_type === 'video' || selectedContent.content_type === 'shorts' || selectedContent.content_type === 'reels') 
                    && mediaUrls.length >= 1
                  ) && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className={cn("w-full h-20 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1.5 hover:border-primary/40 hover:bg-primary/5 transition-colors text-muted-foreground",
                        (selectedContent.content_type === 'video' || selectedContent.content_type === 'shorts' || selectedContent.content_type === 'reels') ? 'max-w-none aspect-[16/9]' : 'max-w-sm'
                      )}
                    >
                      {uploading ? (
                        <Loader2 size={18} className="animate-spin text-primary" />
                      ) : (
                        <>
                          <ImagePlus size={18} />
                          <span className="text-xs text-center px-2">
                            {mediaUrls.length === 0 
                              ? (selectedContent.content_type === 'video' || selectedContent.content_type === 'shorts' || selectedContent.content_type === 'reels' ? 'Clique para enviar vídeo' : 'Clique para enviar imagem') 
                              : 'Adicionar mais mídias'}
                          </span>
                        </>
                      )}
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={(selectedContent.content_type === 'video' || selectedContent.content_type === 'shorts' || selectedContent.content_type === 'reels') ? "video/*" : "image/*,video/*"}
                    multiple={!(selectedContent.content_type === 'post' || selectedContent.content_type === 'video' || selectedContent.content_type === 'shorts' || selectedContent.content_type === 'reels')}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {/* Thumbnail Section (Only for Video types) */}
                {(selectedContent.content_type === 'video' || selectedContent.content_type === 'shorts' || selectedContent.content_type === 'reels') && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <ImagePlus size={12} />Capa do {selectedContent.content_type === 'video' ? 'Vídeo' : 'Reels/Shorts'}
                    </label>
                    {thumbnailUrl ? (
                      <div className={cn("relative rounded-md overflow-hidden bg-muted group", selectedContent.content_type === 'video' ? 'w-full aspect-video' : 'w-full aspect-[9/16]')}>
                        <img src={thumbnailUrl} alt="Capa" className="w-full h-full object-cover cursor-pointer" onClick={() => setLightboxUrl(thumbnailUrl)} />
                        <button
                          onClick={handleRemoveThumbnail}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={12} className="text-white" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => thumbnailInputRef.current?.click()}
                        disabled={uploading}
                        className={cn("w-full border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1.5 hover:border-primary/40 hover:bg-primary/5 transition-colors text-muted-foreground",
                          selectedContent.content_type === 'video' ? 'aspect-video' : 'aspect-[9/16]'
                        )}
                      >
                        {uploading ? (
                          <Loader2 size={18} className="animate-spin text-primary" />
                        ) : (
                          <>
                            <ImagePlus size={18} />
                            <span className="text-xs text-center px-4">Adicionar Capa</span>
                          </>
                        )}
                      </button>
                    )}
                    <input
                      ref={thumbnailInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailUpload}
                      className="hidden"
                    />
                  </div>
                )}
              </div>
            </>
          )}

        </div>

        {/* Right column — Checklist sidebar for idea-bank, Preview & Comments otherwise */}
        {isIdeaBank ? (
          <div className="w-[300px] border-l border-border flex flex-col flex-shrink-0 bg-card overflow-y-auto scrollbar-thin p-5 space-y-4">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <CheckSquare size={12} />Para fazer
            </label>
            <div className="space-y-1.5">
              {checklist.map(item => (
                <button key={item.id} onClick={() => toggleCheckItem(item.id, item.done)} className="flex items-center gap-2.5 text-sm w-full text-left group">
                  <div className={cn("w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                    item.done ? "bg-status-published border-status-published" : "border-border"
                  )}>
                    {item.done && <span className="text-primary-foreground text-[10px]">✓</span>}
                  </div>
                  <span className={cn("flex-1", item.done && "line-through text-muted-foreground")}>{item.text}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmDelete(async () => {
                        await supabase.from('checklist_items').delete().eq('id', item.id);
                        setChecklist(prev => prev.filter(i => i.id !== item.id));
                      }, 'este item do checklist');
                    }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                  >
                    <Trash2 size={12} />
                  </button>
                </button>
              ))}
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newCheckItem.trim() || !selectedContent) return;
                const { data } = await supabase.from('checklist_items').insert({
                  content_id: selectedContent.id,
                  text: newCheckItem.trim(),
                  sort_order: checklist.length,
                }).select().maybeSingle();
                if (data) setChecklist(prev => [...prev, data]);
                setNewCheckItem('');
              }}
              className="flex gap-2"
            >
              <Input
                value={newCheckItem}
                onChange={e => setNewCheckItem(e.target.value)}
                placeholder="Novo item..."
                className="h-8 text-sm"
              />
              <Button type="submit" size="sm" variant="outline" className="h-8 px-2 flex-shrink-0">
                <Plus size={14} />
              </Button>
            </form>
          </div>
        ) : <div className={cn("w-[360px] border-l border-border flex flex-col flex-shrink-0 bg-card", isClient && "w-[400px]")}>
          {/* Right Sidebar Header (Preview & Buttons) for Review/Approval/Published phases */}
          {(selectedContent.status === 'approval-client' || selectedContent.status === 'scheduled' || selectedContent.status === 'published') && (
            <div className="p-5 border-b border-border space-y-5 bg-card/50">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Eye size={12} />Preview</label>
                <div className="flex gap-1">
                  {(Array.isArray(selectedContent.platform) ? selectedContent.platform : [selectedContent.platform]).map(p => (
                    <button
                      key={p}
                      onClick={(e) => { e.stopPropagation(); setPreviewPlatform(p); }}
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center transition-all",
                        previewPlatform === p
                          ? "bg-[#c5daf7] text-[#1369db] shadow-sm"
                          : "bg-secondary text-muted-foreground hover:bg-accent"
                      )}
                      title={PLATFORM_LABELS[p]}
                    >
                      {platformIcon([p], 14)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-center overflow-hidden">
                <div className="w-full max-w-[320px] transform scale-[0.95] origin-top">
                  <PostPreview 
                    content={{
                      ...selectedContent,
                      title: editTitle,
                      copy_text: editCopyText,
                      copy_texts: editCopyTexts,
                      media_urls: mediaUrls,
                      thumbnail_url: thumbnailUrl,
                      description: editBriefing,
                    } as any}
                    platform={previewPlatform} 
                  />
                </div>
              </div>
              
              {/* Quick Actions — Below Preview, Always visible in these phases */}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-9 text-xs gap-1.5 border-0"
                  style={{ backgroundColor: '#c5daf7', color: '#1369db' }}
                  onClick={handleCopyText}
                >
                  <Copy size={14} /> Copiar texto
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-9 text-xs gap-1.5 border-0"
                  style={{ backgroundColor: '#c5daf7', color: '#1369db' }}
                  onClick={handleDownloadMedia}
                >
                  <Download size={14} /> Baixar mídias
                </Button>
              </div>
            </div>
          )}

          {!isClient && !isIdeaBank && (
            <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-4">
              {/* Preview — Only show here if NOT handled in the header above (phases idea/production/review) */}
              {(selectedContent.status === 'idea' || selectedContent.status === 'production' || selectedContent.status === 'review') && (
                <>
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Preview</h3>
                  <div className="flex gap-1.5 justify-center">
                    {(Array.isArray(selectedContent.platform) ? selectedContent.platform : [selectedContent.platform]).map(p => (
                      <button
                        key={p}
                        onClick={() => setPreviewPlatform(p)}
                        className={cn(
                          "w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-sm",
                          previewPlatform === p
                            ? "bg-[#c5daf7] text-[#1369db]"
                            : "bg-secondary text-muted-foreground hover:bg-accent"
                        )}
                        title={PLATFORM_LABELS[p]}
                      >
                        {platformIcon([p], 18)}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-center">
                    <PostPreview 
                      content={{
                        ...selectedContent,
                        title: editTitle,
                        copy_text: editCopyText,
                        copy_texts: editCopyTexts,
                        media_urls: mediaUrls,
                        thumbnail_url: thumbnailUrl,
                        description: editBriefing,
                      } as any} 
                      platform={previewPlatform} 
                    />
                  </div>
                </>
              )}

              {/* Checklist — only for idea/production */}
              {(selectedContent.status === 'idea' || selectedContent.status === 'production') && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><CheckSquare size={12} />Checklist</label>
                  {checklist.length > 0 && (
                    <div className="space-y-1.5 mb-2">
                      {checklist.map(item => (
                        <button key={item.id} onClick={() => toggleCheckItem(item.id, item.done)} className="flex items-center gap-2.5 text-sm w-full text-left">
                          <div className={cn("w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0",
                            item.done ? "bg-status-published border-status-published" : "border-border"
                          )}>
                            {item.done && <span className="text-primary-foreground text-[10px]">✓</span>}
                          </div>
                          <span className={cn(item.done && "line-through text-muted-foreground")}>{item.text}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {checklist.length === 0 && (
                    <p className="text-xs text-muted-foreground italic mb-2">Nenhum item na checklist.</p>
                  )}
                  {!isClient && (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!newCheckItem.trim() || !selectedContent) return;
                        const { data } = await supabase.from('checklist_items').insert({
                          content_id: selectedContent.id,
                          text: newCheckItem.trim(),
                          sort_order: checklist.length,
                        }).select().maybeSingle();
                        if (data) setChecklist(prev => [...prev, data]);
                        setNewCheckItem('');
                      }}
                      className="flex gap-2"
                    >
                      <Input
                        value={newCheckItem}
                        onChange={e => setNewCheckItem(e.target.value)}
                        placeholder="Novo item..."
                        className="h-8 text-sm"
                      />
                      <Button type="submit" size="sm" variant="outline" className="h-8 px-2 flex-shrink-0">
                        <Plus size={14} />
                      </Button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          {selectedContent.status !== 'idea' && (
            <div className={cn("p-5 flex flex-col min-h-0", isClient ? "flex-1 overflow-hidden" : "max-h-[50%]")}>
              {/* Admin/Agency Quick Actions (REMOVED: Now handled in fixed header above for consistency) */}


              {/* In-comment Preview for Clients — MOVED ABOVE */}
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><MessageSquare size={12} />Comentários</label>
              <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2.5 mb-3">
                {comments.map(c => (
                  <div key={c.id} className="bg-secondary rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-foreground">{c.profile?.display_name ?? 'Usuário'}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString('pt-BR')} {new Date(c.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {c.text && <p className="text-xs text-muted-foreground">{c.text}</p>}
                    {c.image_url && (
                      <img src={c.image_url} alt="Anexo" className="mt-2 rounded-md max-h-40 object-cover cursor-pointer" onClick={() => window.open(c.image_url, '_blank')} />
                    )}
                  </div>
                ))}
                {comments.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Nenhum comentário ainda.</p>
                )}
              </div>
              {(!isClient || isClientApproval) && (
                <>
                  {commentImageUrl && (
                    <div className="relative mb-2 inline-block">
                      <img src={commentImageUrl} alt="Preview" className="h-16 rounded-md object-cover" />
                      <button
                        onClick={() => setCommentImageUrl(null)}
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-[8px]"
                      >✕</button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                      placeholder="Adicionar comentário..."
                      className="flex-1 h-8 px-3 rounded-md bg-secondary text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/20"
                    />
                    <button
                      onClick={() => commentFileRef.current?.click()}
                      disabled={commentUploading}
                      className="w-8 h-8 rounded-md flex items-center justify-center bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      title="Anexar imagem"
                    >
                      {commentUploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                    </button>
                    <input ref={commentFileRef} type="file" accept="image/*" onChange={handleCommentImageUpload} className="hidden" />
                    <button
                      onClick={handleAddComment}
                      className="w-8 h-8 rounded-md flex items-center justify-center bg-primary hover:opacity-90 transition-opacity"
                    >
                      <Send size={14} className="text-primary-foreground" />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>}
      </div>

      {/* Lightbox modal */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            onClick={() => setLightboxUrl(null)}
          >
            <X size={20} className="text-white" />
          </button>
          <img
            src={lightboxUrl}
            alt="Preview"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      {/* Unsaved changes dialog */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterações não salvas</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem alterações que não foram salvas. Deseja salvar antes de sair?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDiscardAndClose}>Sair sem salvar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveAndClose}>Salvar e sair</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ConfirmDialog />
    </div>
  );
};

export default ContentPanel;
