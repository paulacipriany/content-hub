import { useMemo, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import { Image, Search, ExternalLink, Trash2 } from 'lucide-react';
import { useClientFromUrl } from '@/hooks/useClientFromUrl';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const MediaLibraryPage = () => {
  useClientFromUrl();
  const { projectContents, selectedProject } = useApp();
  const [search, setSearch] = useState('');

  // Collect all media URLs from project contents with metadata
  const mediaItems = useMemo(() => {
    const items: { url: string; contentTitle: string; contentId: string }[] = [];
    projectContents.forEach(content => {
      // Collect from media_urls array
      if (content.media_urls && Array.isArray(content.media_urls)) {
        (content.media_urls as string[]).forEach(url => {
          if (url) items.push({ url, contentTitle: content.title, contentId: content.id });
        });
      }
      // Fallback to single media_url if not already included
      if (content.media_url && !items.some(i => i.url === content.media_url)) {
        items.push({ url: content.media_url, contentTitle: content.title, contentId: content.id });
      }
    });
    return items;
  }, [projectContents]);

  const filtered = search.trim()
    ? mediaItems.filter(item => item.contentTitle.toLowerCase().includes(search.toLowerCase()))
    : mediaItems;

  return (
    <>
      <TopBar title="Biblioteca de Mídia" subtitle="Todas as imagens enviadas neste cliente" />
      <div className="p-6">
        <div className="relative mb-6 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome do conteúdo..."
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
          {filtered.length} {filtered.length === 1 ? 'arquivo' : 'arquivos'} encontrados
        </p>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Image size={48} className="mb-3 opacity-40" />
            <p className="text-sm">Nenhuma mídia encontrada</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map((item, i) => (
              <div
                key={`${item.url}-${i}`}
                className="group relative aspect-square rounded-lg overflow-hidden border bg-card hover:shadow-lg transition-all cursor-pointer"
                style={{ borderColor: 'var(--client-100, hsl(var(--border)))' }}
              >
                <img
                  src={item.url}
                  alt={item.contentTitle}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                  <p className="text-white text-xs font-medium truncate">{item.contentTitle}</p>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-white/80 hover:text-white text-[10px]"
                    onClick={e => e.stopPropagation()}
                  >
                    <ExternalLink size={10} /> Abrir original
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default MediaLibraryPage;
