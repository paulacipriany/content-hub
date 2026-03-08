import { X, MessageSquare, CheckSquare, Hash, Calendar as CalIcon, User, Send, Check, Pencil, Eye, ImagePlus, Trash2, Loader2 } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { STATUS_LABELS, STATUS_COLORS, PLATFORM_LABELS, CONTENT_TYPE_LABELS, WorkflowStatus, Platform, ContentType } from '@/data/types';
import { platformIcon } from './ContentCard';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef, useCallback } from 'react';
import PostPreview from './PostPreview';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const allStatuses: WorkflowStatus[] = ['idea', 'production', 'review', 'approval-internal', 'approval-client', 'scheduled', 'published'];
const allPlatforms: Platform[] = ['instagram', 'facebook', 'linkedin', 'tiktok', 'youtube'];
const allContentTypes: ContentType[] = ['feed', 'reels', 'stories', 'carousel', 'video'];

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
  const [editDescription, setEditDescription] = useState('');
  const [editHashtagInput, setEditHashtagInput] = useState('');
  const [editHashtags, setEditHashtags] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync local state when selected content changes
  useEffect(() => {
    if (!selectedContent) return;
    setEditTitle(selectedContent.title);
    setEditDescription(selectedContent.description ?? '');
    setEditHashtags(selectedContent.hashtags ?? []);
    setEditHashtagInput('');
  }, [selectedContent?.id]);

  // Auto-save title & description
  useAutoSave(selectedContent?.id, 'title', editTitle, updateContentFields);
  useAutoSave(selectedContent?.id, 'description', editDescription, updateContentFields);

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

  const handlePlatformChange = (value: string) => {
    updateContentFields(selectedContent.id, { platform: value as Platform });
  };

  const handleTypeChange = (value: string) => {
    updateContentFields(selectedContent.id, { content_type: value as ContentType });
  };

  const handleDateChange = (date: Date | undefined) => {
    const dateStr = date ? format(date, 'yyyy-MM-dd') : null;
    updateContentFields(selectedContent.id, { publish_date: dateStr });
  };

  const handleAddHashtag = () => {
    const tag = editHashtagInput.trim().replace(/^#/, '');
    if (!tag || editHashtags.includes(`#${tag}`)) return;
    const newTags = [...editHashtags, `#${tag}`];
    setEditHashtags(newTags);
    setEditHashtagInput('');
    updateContentFields(selectedContent.id, { hashtags: newTags });
  };

  const handleRemoveHashtag = (tag: string) => {
    const newTags = editHashtags.filter(h => h !== tag);
    setEditHashtags(newTags);
    updateContentFields(selectedContent.id, { hashtags: newTags });
  };

  return (
    <div className="w-[420px] border-l border-border bg-card flex flex-col h-full animate-slide-in-right flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-5 h-14 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {platformIcon(selectedContent.platform, 16)}
          <input
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            className="font-semibold text-sm text-foreground bg-transparent border-none outline-none w-full focus:ring-0 hover:bg-secondary/50 focus:bg-secondary rounded px-1 -ml-1 transition-colors"
            placeholder="Título do conteúdo"
          />
        </div>
        <button onClick={() => setSelectedContent(null)} className="text-muted-foreground hover:text-foreground transition-colors ml-2">
          <X size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border flex-shrink-0">
        <button
          onClick={() => setActiveTab('edit')}
          className={cn("flex-1 py-2.5 text-xs font-medium transition-colors flex items-center justify-center gap-1.5",
            activeTab === 'edit' ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Pencil size={12} /> Editar
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={cn("flex-1 py-2.5 text-xs font-medium transition-colors flex items-center justify-center gap-1.5",
            activeTab === 'preview' ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Eye size={12} /> Preview
        </button>
      </div>

      {/* Content */}
      {activeTab === 'edit' ? (
      <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-5">
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

        {/* Editable Details */}
        <div className="space-y-3">
          {/* Platform */}
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground w-24 flex-shrink-0">Plataforma</span>
            <Select value={selectedContent.platform} onValueChange={handlePlatformChange}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allPlatforms.map(p => (
                  <SelectItem key={p} value={p}>{PLATFORM_LABELS[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Content Type */}
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

          {/* Publish Date */}
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
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Assignee (read-only for now) */}
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground w-24 flex-shrink-0">Responsável</span>
            <div className="flex items-center gap-2 h-8 px-3 text-xs rounded-md border border-input bg-background text-foreground flex-1">
              <User size={12} className="text-muted-foreground" />
              <span>{assigneeName}</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Descrição / Copy</label>
          <textarea
            value={editDescription}
            onChange={e => setEditDescription(e.target.value)}
            rows={4}
            placeholder="Adicione a descrição ou copy do conteúdo..."
            className="w-full text-sm text-foreground bg-secondary rounded-lg p-3 outline-none resize-none focus:ring-2 focus:ring-ring/20 hover:bg-secondary/80 transition-colors"
          />
        </div>

        {/* Hashtags */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Hash size={12} />Hashtags
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {editHashtags.map(h => (
              <button
                key={h}
                onClick={() => handleRemoveHashtag(h)}
                className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium hover:bg-destructive/20 hover:text-destructive transition-colors group"
                title="Clique para remover"
              >
                {h} <span className="opacity-0 group-hover:opacity-100 ml-0.5">×</span>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={editHashtagInput}
              onChange={e => setEditHashtagInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddHashtag())}
              placeholder="#novahashtag"
              className="flex-1 h-8 px-3 rounded-md bg-secondary text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/20"
            />
            <button onClick={handleAddHashtag} className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity">
              Adicionar
            </button>
          </div>
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

        {/* Comments */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><MessageSquare size={12} />Comentários</label>
          <div className="space-y-2.5">
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

          <div className="flex gap-2 mt-3">
            <input
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddComment()}
              placeholder="Adicionar comentário..."
              className="flex-1 h-8 px-3 rounded-md bg-secondary text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/20"
            />
            <button onClick={handleAddComment} className="w-8 h-8 rounded-md bg-primary flex items-center justify-center hover:opacity-90 transition-opacity">
              <Send size={14} className="text-primary-foreground" />
            </button>
          </div>
        </div>
      </div>
      ) : (
      <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-4">
        {/* Platform selector for preview */}
        <div className="flex gap-1.5 justify-center">
          {(['instagram', 'facebook', 'linkedin'] as Platform[]).map(p => (
            <button
              key={p}
              onClick={() => setPreviewPlatform(p)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                previewPlatform === p
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-accent"
              )}
            >
              {PLATFORM_LABELS[p]}
            </button>
          ))}
        </div>
        <PostPreview content={selectedContent} platform={previewPlatform} />
      </div>
      )}

      {/* Footer */}
      {canAdvance && (
        <div className="p-4 border-t border-border flex-shrink-0">
          <Button
            className="w-full"
            onClick={() => updateContentStatus(selectedContent.id, allStatuses[currentIdx + 1])}
          >
            Avançar para {STATUS_LABELS[allStatuses[currentIdx + 1]]}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ContentPanel;
