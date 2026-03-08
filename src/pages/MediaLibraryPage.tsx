import TopBar from '@/components/layout/TopBar';
import { Image, Search } from 'lucide-react';
import { useClientFromUrl } from '@/hooks/useClientFromUrl';

const MediaLibraryPage = () => {
  useClientFromUrl();

  return (
    <>
      <TopBar title="Biblioteca de Mídia" subtitle="Gerencie imagens, vídeos e templates" />
      <div className="p-6">
        <div className="relative mb-6 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar arquivos..."
            className="w-full h-10 pl-9 pr-4 rounded-lg bg-card border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 transition-colors"
            style={{
              borderColor: 'var(--client-200, hsl(var(--border)))',
              // @ts-ignore
              '--tw-ring-color': 'var(--client-300, hsl(var(--ring) / 0.2))',
            }}
          />
        </div>

        <h2 className="text-sm font-semibold text-foreground mb-3">Arquivos Recentes</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-lg flex items-center justify-center hover:opacity-80 transition-all cursor-pointer border"
              style={{
                backgroundColor: 'var(--client-50, hsl(var(--secondary)))',
                borderColor: 'var(--client-100, hsl(var(--border)))',
              }}
            >
              <Image size={24} style={{ color: 'var(--client-300, hsl(var(--muted-foreground) / 0.4))' }} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default MediaLibraryPage;
