import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import TopBar from '@/components/layout/TopBar';
import { Image, Search, ExternalLink, Trash2, Download, Plus, Link2, X } from 'lucide-react';
import { useClientFromUrl } from '@/hooks/useClientFromUrl';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

interface MediaItem {
  id: string;
  url: string;
  filename: string;
  content_id: string | null;
  contentTitle: string | null;
  source: 'library' | 'content';
}

const MediaLibraryPage = () => {
  useClientFromUrl();
  const { projectContents, selectedProject, updateContentFields } = useApp();
  const { role, user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canDelete = role === 'admin' || role === 'moderator';

  // Associate dialog
  const [associateItem, setAssociateItem] = useState<MediaItem | null>(null);
  const [contentSearch, setContentSearch] = useState('');

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

  const handleAssociate = async (contentId: string) => {
    if (!associateItem) return;
    await supabase.from('media_library').update({ content_id: contentId } as any).eq('id', associateItem.id);

    // Also add to content's media_urls
    const content = projectContents.find(c => c.id === contentId);
    if (content) {
      const currentUrls = (content.media_urls && Array.isArray(content.media_urls) ? content.media_urls : []).filter(Boolean) as string[];
      if (!currentUrls.includes(associateItem.url)) {
        const updatedUrls = [...currentUrls, associateItem.url];
        await updateContentFields(contentId, {
          media_url: updatedUrls[0] ?? null,
          media_urls: updatedUrls,
        });
      }
    }

    setMediaItems(prev => prev.map(m => m.id === associateItem.id ? { ...m, content_id: contentId, contentTitle: content?.title ?? null } : m));
    setAssociateItem(null);
    setContentSearch('');
    toast({ title: 'Imagem associada à postagem!' });
  };

  const filtered = search.trim()
    ? mediaItems.filter(item =>
        item.filename.toLowerCase().includes(search.toLowerCase()) ||
        (item.contentTitle && item.contentTitle.toLowerCase().includes(search.toLowerCase()))
      )
    : mediaItems;

  const filteredContents = contentSearch.trim()
    ? projectContents.filter(c => c.title.toLowerCase().includes(contentSearch.toLowerCase()))
    : projectContents.slice(0, 10);

  return (
    <>
      <TopBar
        title="Biblioteca de Mídia"
        subtitle="Todas as imagens deste cliente"
        actions={
          <>
            <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={handleUpload} className="hidden" />
            <Button
              size="sm"
              className="gap-1.5 h-9"
              style={{ backgroundColor: 'var(--client-500, hsl(var(--primary)))', color: 'var(--client-500-contrast, hsl(var(--primary-foreground)))' }}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              <span className="hidden sm:inline">Adicionar imagem</span>
            </Button>
          </>
        }
      />
      <div className="p-6">
        <div className="relative mb-6 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-lg bg-card border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 transition-colors"
            style={{
              borderColor: 'var(--client-200, hsl(var(--border)))',
              // @ts-ignore
              '--tw-ring-color': 'var(--client-300, hsl(var(--ring) / 0.2))',
            }}
          />
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
            <p className="text-xs mt-1">Clique em "Adicionar imagem" para enviar arquivos.</p>
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

                {/* Association badge */}
                {item.contentTitle && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/60 text-white truncate max-w-[80%]">
                    {item.contentTitle}
                  </div>
                )}

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                  <p className="text-white text-xs font-medium truncate">{item.filename}</p>
                  {item.contentTitle && (
                    <p className="text-white/70 text-[10px] truncate">Vinculada: {item.contentTitle}</p>
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
                    <button
                      onClick={(e) => { e.stopPropagation(); setAssociateItem(item); }}
                      className="inline-flex items-center gap-1 text-white/80 hover:text-white text-[10px]"
                    >
                      <Link2 size={10} /> Vincular
                    </button>
                    <div className="ml-auto">
                      {canDelete && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
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

      {/* Associate dialog */}
      <Dialog open={!!associateItem} onOpenChange={(v) => { if (!v) { setAssociateItem(null); setContentSearch(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Vincular imagem a uma postagem</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar postagem..."
                value={contentSearch}
                onChange={e => setContentSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filteredContents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma postagem encontrada</p>
              ) : (
                filteredContents.map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleAssociate(c.id)}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors flex items-center gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
                      <p className="text-[11px] text-muted-foreground">{c.status} · {c.publish_date || 'Sem data'}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MediaLibraryPage;
