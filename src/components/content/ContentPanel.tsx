import { X, MessageSquare, CheckSquare, Calendar as CalIcon, User, Send, Check, Pencil, Eye, ImagePlus, Trash2, Loader2, Clock } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { STATUS_LABELS, STATUS_COLORS, PLATFORM_LABELS, CONTENT_TYPE_LABELS, WorkflowStatus, Platform, ContentType } from '@/data/types';
import { platformIcon, PlatformSelector } from './PlatformIcons';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef, useCallback } from 'react';
import PostPreview from './PostPreview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const allStatuses: WorkflowStatus[] = ['idea', 'production', 'review', 'approval-internal', 'approval-client', 'scheduled', 'published'];
const allPlatforms: Platform[] = ['instagram', 'facebook', 'linkedin', 'tiktok', 'youtube'];
const allContentTypes: ContentType[] = ['video', 'shorts', 'post', 'stories'];

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
  const { user, profile } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [previewPlatform, setPreviewPlatform] = useState<Platform>('instagram');

  // Editable local state
  const [editTitle, setEditTitle] = useState('');
  const [editCopyText, setEditCopyText] = useState('');
  const [editPublishTime, setEditPublishTime] = useState('');
  const [uploading, setUploading] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync local state when selected content changes
  useEffect(() => {
    if (!selectedContent) return;
    setEditTitle(selectedContent.title);
    setEditCopyText((selectedContent as any).copy_text ?? '');
    setEditPublishTime((selectedContent as any).publish_time ?? '');
    // Load media_urls or fallback to single media_url
    const urls = (selectedContent as any).media_urls;
    if (urls && Array.isArray(urls) && urls.length > 0) {
      setMediaUrls(urls);
    } else if (selectedContent.media_url) {
      setMediaUrls([selectedContent.media_url]);
    } else {
      setMediaUrls([]);
    }
  }, [selectedContent?.id]);

  // Auto-save title & copy_text
  useAutoSave(selectedContent?.id, 'title', editTitle, updateContentFields);
  useAutoSave(selectedContent?.id, 'copy_text', editCopyText, updateContentFields);

  useEffect(() => {
    if (!selectedContent) return;
    supabase
      .from('comments')
      .select('*')
      .eq('content_id', selectedContent.id)
      .order('created_at', { ascending: true })
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
  }, [selectedContent?.id]);

  if (!selectedContent) return null;

  const currentIdx = allStatuses.indexOf(selectedContent.status as WorkflowStatus);
  const canAdvance = currentIdx < allStatuses.length - 1;
  const assigneeName = selectedContent.assignee_profile?.display_name ?? 'Sem responsável';

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return;
    await supabase.from('comments').insert({
      content_id: selectedContent.id,
      user_id: user.id,
      text: newComment.trim(),
    });
    setComments(prev => [...prev, {
      id: crypto.randomUUID(),
      content_id: selectedContent.id,
      user_id: user.id,
      text: newComment.trim(),
      created_at: new Date().toISOString(),
      profile: { display_name: profile?.display_name },
    }]);
    setNewComment('');
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
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !user || !selectedContent) return;
    setUploading(true);
    try {
      const newUrls: string[] = [];
      for (const file of files) {
        const ext = file.name.split('.').pop();
        const path = `${selectedContent.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from('content-media').upload(path, file);
        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from('content-media').getPublicUrl(path);
          newUrls.push(publicUrl);
        }
      }
      const updatedUrls = [...mediaUrls, ...newUrls];
      setMediaUrls(updatedUrls);
      await updateContentFields(selectedContent.id, {
        media_url: updatedUrls[0] ?? null,
        media_urls: updatedUrls,
      });
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveMedia = async (index: number) => {
    const updatedUrls = mediaUrls.filter((_, i) => i !== index);
    setMediaUrls(updatedUrls);
    await updateContentFields(selectedContent.id, {
      media_url: updatedUrls[0] ?? null,
      media_urls: updatedUrls,
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 h-14 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={() => setSelectedContent(null)}
            className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <X size={18} />
          </button>
          {platformIcon(selectedContent.platform, 18)}
          <input
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            className="font-semibold text-base text-foreground bg-transparent border-none outline-none w-full focus:ring-0 hover:bg-secondary/50 focus:bg-secondary rounded px-2 -ml-1 transition-colors"
            placeholder="Título do conteúdo"
          />
          <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium text-primary-foreground flex-shrink-0", STATUS_COLORS[selectedContent.status as WorkflowStatus])}>
            {STATUS_LABELS[selectedContent.status as WorkflowStatus]}
          </span>
        </div>
        {canAdvance && (
          <Button
            size="sm"
            className="ml-4"
            style={{ backgroundColor: 'var(--client-500, hsl(var(--primary)))', color: 'var(--client-50, hsl(var(--primary-foreground)))' }}
            onClick={() => updateContentStatus(selectedContent.id, allStatuses[currentIdx + 1])}
          >
            Avançar para {STATUS_LABELS[allStatuses[currentIdx + 1]]}
          </Button>
        )}
      </div>

      {/* Two-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left column — Edit */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-5 max-w-2xl">
          {/* Status */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Status</label>
            <div className="flex flex-wrap gap-1.5">
              {allStatuses.map(s => (
                <button
                  key={s}
                  onClick={() => updateContentStatus(selectedContent.id, s)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                    selectedContent.status === s
                      ? cn(STATUS_COLORS[s], "text-primary-foreground")
                      : "bg-secondary text-muted-foreground hover:bg-accent"
                  )}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground w-24 flex-shrink-0">Plataforma</span>
              <PlatformSelector
                selected={Array.isArray(selectedContent.platform) ? selectedContent.platform : [selectedContent.platform]}
                onChange={handlePlatformChange}
                size={28}
              />
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground w-24 flex-shrink-0">Tipo</span>
              <Select value={selectedContent.content_type} onValueChange={handleTypeChange}>
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allContentTypes.map(t => (
                    <SelectItem key={t} value={t}>{CONTENT_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground w-24 flex-shrink-0">Publicação</span>
              <Popover>
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
                    onSelect={handleDateChange}
                    locale={ptBR}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground w-24 flex-shrink-0">Horário</span>
              <div className="relative flex-1">
                <Clock size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="time"
                  value={editPublishTime}
                  onChange={e => handleTimeChange(e.target.value)}
                  className="h-8 w-full pl-8 pr-3 text-xs rounded-md border border-input bg-background text-foreground"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground w-24 flex-shrink-0">Responsável</span>
              <div className="flex items-center gap-2 h-8 px-3 text-xs rounded-md border border-input bg-background text-foreground flex-1">
                <User size={12} className="text-muted-foreground" />
                <span>{assigneeName}</span>
              </div>
            </div>
          </div>

          {/* Briefing (read-only) */}
          {selectedContent.description && (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Briefing</label>
              <p className="text-sm text-foreground whitespace-pre-wrap">{selectedContent.description}</p>
                {selectedContent.description}
              </div>
            </div>
          )}

          {/* Copy text (editable) */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Copy</label>
            <textarea
              value={editCopyText}
              onChange={e => setEditCopyText(e.target.value)}
              rows={5}
              placeholder="Escreva a copy da postagem..."
              className="w-full text-sm text-foreground bg-secondary rounded-lg p-3 outline-none resize-none focus:ring-2 focus:ring-ring/20 hover:bg-secondary/80 transition-colors"
            />
          </div>

          {/* Media Upload — multiple images */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <ImagePlus size={12} />Mídia
            </label>
            {mediaUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-2">
                {mediaUrls.map((url, i) => (
                  <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
                    {url.match(/\.(mp4|webm|mov)$/i) ? (
                      <video src={url} controls className="w-full h-full object-cover" />
                    ) : (
                      <img src={url} alt={`Mídia ${i + 1}`} className="w-full h-full object-cover" />
                    )}
                    <button
                      onClick={() => handleRemoveMedia(i)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full max-w-sm h-20 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1.5 hover:border-primary/40 hover:bg-primary/5 transition-colors text-muted-foreground"
            >
              {uploading ? (
                <Loader2 size={18} className="animate-spin text-primary" />
              ) : (
                <>
                  <ImagePlus size={18} />
                  <span className="text-xs">{mediaUrls.length === 0 ? 'Clique para enviar imagens' : 'Adicionar mais imagens'}</span>
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* Checklist */}
          {checklist.length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><CheckSquare size={12} />Checklist</label>
              <div className="space-y-1.5">
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
            </div>
          )}
        </div>

        {/* Right column — Preview & Comments */}
        <div className="w-[400px] border-l border-border flex flex-col flex-shrink-0 bg-card">
          {/* Preview */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-4">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Preview</h3>
            <div className="flex gap-1.5 justify-center">
              {(['instagram', 'facebook', 'linkedin'] as Platform[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPreviewPlatform(p)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                    previewPlatform === p
                      ? "text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:bg-accent"
                  )}
                  style={previewPlatform === p ? { backgroundColor: 'var(--client-500, hsl(var(--primary)))' } : undefined}
                >
                  {PLATFORM_LABELS[p]}
                </button>
              ))}
            </div>
            <PostPreview content={selectedContent} platform={previewPlatform} />
          </div>

          {/* Comments */}
          <div className="border-t border-border p-5 max-h-[40%] flex flex-col">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><MessageSquare size={12} />Comentários</label>
            <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2.5 mb-3">
              {comments.map(c => (
                <div key={c.id} className="bg-secondary rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-foreground">{c.profile?.display_name ?? 'Usuário'}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{c.text}</p>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-xs text-muted-foreground italic">Nenhum comentário ainda.</p>
              )}
            </div>
            <div className="flex gap-2">
              <input
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                placeholder="Adicionar comentário..."
                className="flex-1 h-8 px-3 rounded-md bg-secondary text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/20"
              />
              <button
                onClick={handleAddComment}
                className="w-8 h-8 rounded-md flex items-center justify-center hover:opacity-90 transition-opacity"
                style={{ backgroundColor: 'var(--client-500, hsl(var(--primary)))' }}
              >
                <Send size={14} className="text-primary-foreground" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentPanel;
