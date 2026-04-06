import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import TopBar from '@/components/layout/TopBar';
import { Image, Search, ExternalLink, Trash2, Download, Plus } from 'lucide-react';
import { useClientFromUrl } from '@/hooks/useClientFromUrl';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar as CalIcon, Filter, X } from 'lucide-react';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CONTENT_TYPE_LABELS, VISIBLE_CONTENT_TYPES, ContentType, PLATFORM_LABELS, Platform } from '@/data/types';
import { cn } from '@/lib/utils';
import { DateRange } from "react-day-picker";

interface MediaItem {
  id: string;
  url: string;
  filename: string;
  content_id: string | null;
  contentTitle: string | null;
  source: 'library' | 'content';
  publish_date: string | null;
  content_type: ContentType | null;
  platforms: Platform[] | null;
  created_at: string;
}

const MediaLibraryPage = () => {
  useClientFromUrl();
  const { projectContents, selectedProject, updateContentFields } = useApp();
  const { role, user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isClient = role === 'client';
  const canDelete = !isClient && (role === 'admin' || role === 'moderator');
  const { confirmDelete, ConfirmDialog } = useConfirmDelete();


  const fetchMedia = useCallback(async () => {
    if (!selectedProject) return;
    setLoading(true);
    const { data } = await supabase
      .from('media_library')
      .select('*')
      .eq('project_id', selectedProject.id)
      .order('created_at', { ascending: false });

    const libraryItems: MediaItem[] = (data ?? []).map((m: any) => {
      const content = m.content_id ? projectContents.find(c => c.id === m.content_id) : null;
      return {
        id: m.id,
        url: m.url,
        filename: m.filename,
        content_id: m.content_id,
        contentTitle: content?.title ?? null,
        source: 'library' as const,
        publish_date: content?.publish_date ?? null,
        content_type: content?.content_type ?? null,
        platforms: (content?.platform as Platform[]) ?? null,
        created_at: m.created_at,
      };
    });

    // Collect media from contents
    const libraryUrls = new Set(libraryItems.map(i => i.url));
    const contentItems: MediaItem[] = [];
    projectContents.forEach(content => {
      const urls: string[] = [];
      if (content.media_urls && Array.isArray(content.media_urls)) {
        (content.media_urls as string[]).forEach(u => { if (u) urls.push(u); });
      }
      if (content.media_url && !urls.includes(content.media_url)) {
        urls.push(content.media_url);
      }
      if (content.briefing_images && Array.isArray(content.briefing_images)) {
        (content.briefing_images as string[]).forEach(u => { if (u && !urls.includes(u)) urls.push(u); });
      }
      urls.forEach(url => {
        if (!libraryUrls.has(url)) {
          libraryUrls.add(url);
          contentItems.push({
            id: `content-${content.id}-${url}`,
            url,
            filename: content.title,
            content_id: content.id,
            contentTitle: content.title,
            source: 'content',
            publish_date: content.publish_date ?? null,
            content_type: content.content_type ?? null,
            platforms: (content.platform as Platform[]) ?? null,
            created_at: content.created_at,
          });
        }
      });
    });

    setMediaItems([...libraryItems, ...contentItems]);
    setLoading(false);
  }, [selectedProject?.id, projectContents]);

  useEffect(() => { fetchMedia(); }, [fetchMedia]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !user || !selectedProject) return;
    setUploading(true);
    try {
      for (const file of files) {
        const ext = file.name.split('.').pop();
        const path = `library/${selectedProject.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from('content-media').upload(path, file);
        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from('content-media').getPublicUrl(path);
          await supabase.from('media_library').insert({
            project_id: selectedProject.id,
            url: publicUrl,
            filename: file.name,
            uploaded_by: user.id,
          } as any);
        }
      }
      toast({ title: 'Imagens enviadas!' });
      await fetchMedia();
    } catch (err) {
      console.error('Upload error:', err);
      toast({ title: 'Erro ao enviar', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (item: MediaItem) => {
    if (item.source === 'library') {
      await supabase.from('media_library').delete().eq('id', item.id);
    }
    // Also remove from content media_urls if linked
    if (item.content_id) {
      const content = projectContents.find(c => c.id === item.content_id);
      if (content) {
        const currentUrls = (content.media_urls && Array.isArray(content.media_urls) ? content.media_urls : []).filter(Boolean) as string[];
        const updatedUrls = currentUrls.filter(u => u !== item.url);
        await updateContentFields(item.content_id, {
          media_url: updatedUrls[0] ?? null,
          media_urls: updatedUrls,
        });
      }
    }
    setMediaItems(prev => prev.filter(m => m.id !== item.id));
    toast({ title: 'Mídia excluída' });
  };


  const filtered = useMemo(() => {
    return mediaItems.filter(item => {
      const matchesSearch = !search.trim() || 
        item.filename.toLowerCase().includes(search.toLowerCase()) ||
        (item.contentTitle && item.contentTitle.toLowerCase().includes(search.toLowerCase()));
      
      const matchesType = typeFilter === 'all' || item.content_type === typeFilter;
      
      const matchesPlatform = platformFilter === 'all' || 
        (item.platforms && item.platforms.includes(platformFilter as Platform));
      
      const matchesDate = !dateRange?.from || (() => {
        if (!item.publish_date) return false;
        const from = format(dateRange.from, 'yyyy-MM-dd');
        const to = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : from;
        return item.publish_date >= from && item.publish_date <= to;
      })();

      return matchesSearch && matchesType && matchesPlatform && matchesDate;
    });
  }, [mediaItems, search, typeFilter, platformFilter, dateRange]);


  return (
    <>
      <TopBar
        title="Biblioteca de Mídia"
        subtitle="Todas as imagens deste cliente"
        actions={!isClient && (
          <>
            <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={handleUpload} className="hidden" />
            <Button
              size="sm"
              className="gap-1.5 h-9 btn-action-primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              <span className="hidden sm:inline">Adicionar imagem</span>
            </Button>
          </>
        )}
      />
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          {/* Filters (left) */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-3 h-10 rounded-lg bg-card border border-border">
              <Filter size={14} className="text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mr-2">Filtros:</span>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-7 border-none bg-transparent shadow-none px-2 w-[200px] text-xs focus:ring-0">
                  <SelectValue placeholder="Tipo de postagem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {VISIBLE_CONTENT_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{CONTENT_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="w-px h-4 bg-border mx-1" />

              <Popover>
                <PopoverTrigger asChild>
                  <button className={cn(
                    "flex items-center gap-1.5 h-7 px-2 rounded-md transition-colors text-xs font-medium",
                    dateRange?.from ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
                  )}>
                    <CalIcon size={14} />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        `${format(dateRange.from, 'dd/MM/yy')} - ${format(dateRange.to, 'dd/MM/yy')}`
                      ) : format(dateRange.from, 'dd/MM/yy')
                    ) : 'Período de postagem'}
                    {dateRange?.from && (
                      <X 
                        size={14} 
                        className="ml-1 hover:text-foreground" 
                        onClick={(e) => { e.stopPropagation(); setDateRange(undefined); }} 
                      />
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    locale={ptBR}
                    className="p-3"
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            {(typeFilter !== 'all' || dateRange?.from) && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { setTypeFilter('all'); setDateRange(undefined); }}
                className="text-xs h-8 text-muted-foreground hover:text-foreground"
              >
                Limpar filtros
              </Button>
            )}
          </div>

          {/* Search (right) */}
          <div className="relative w-full md:max-w-[220px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/20 transition-colors"
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-3">
          {filtered.length} {filtered.length === 1 ? 'arquivo' : 'arquivos'}
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Image size={48} className="mb-3 opacity-40" />
            <p className="text-sm">Nenhuma mídia encontrada</p>
            {!isClient && <p className="text-xs mt-1">Clique em "Adicionar imagem" para enviar arquivos.</p>}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="group relative aspect-square rounded-lg overflow-hidden border bg-card hover:shadow-lg transition-all cursor-pointer"
                style={{ borderColor: 'var(--client-100, hsl(var(--border)))' }}
              >
                {item.url.match(/\.(mp4|webm|mov)$/i) ? (
                  <video src={item.url} className="w-full h-full object-cover" />
                ) : (
                  <img src={item.url} alt={item.filename} className="w-full h-full object-cover" loading="lazy" />
                )}

                {/* Images in library cards */}

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                  <div className="mb-auto">
                    <p className="text-white/50 text-[10px]">Upload em {format(new Date(item.created_at), 'dd/MM/yyyy')}</p>
                  </div>
                  {item.contentTitle && (
                    <p className="text-white text-xs font-semibold truncate">Vinculada: {item.contentTitle}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-white/80 hover:text-white text-[10px]"
                      onClick={e => e.stopPropagation()}
                    >
                      <ExternalLink size={10} /> Abrir
                    </a>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const res = await fetch(item.url);
                          const blob = await res.blob();
                          const a = document.createElement('a');
                          a.href = URL.createObjectURL(blob);
                          const ext = item.url.split('.').pop()?.split('?')[0] || 'jpg';
                          a.download = `${item.filename.replace(/[^a-zA-Z0-9]/g, '_')}.${ext}`;
                          a.click();
                          URL.revokeObjectURL(a.href);
                        } catch { window.open(item.url, '_blank'); }
                      }}
                      className="inline-flex items-center gap-1 text-white/80 hover:text-white text-[10px]"
                    >
                      <Download size={10} /> Download
                    </button>
                    <div className="ml-auto">
                      {canDelete && (
                        <button
                          onClick={(e) => { e.stopPropagation(); confirmDelete(() => handleDelete(item), `"${item.filename}"`); }}
                          className="w-7 h-7 rounded-full bg-destructive/80 hover:bg-destructive flex items-center justify-center transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={12} className="text-white" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog />
    </>
  );
};

export default MediaLibraryPage;
