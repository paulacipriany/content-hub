import TopBar from '@/components/layout/TopBar';
import { Image, FolderOpen, Search } from 'lucide-react';

const folders = [
  { name: 'Kestal Ortopédicos', files: 12 },
  { name: 'Studio Fitness', files: 8 },
  { name: 'Café Artesanal', files: 5 },
  { name: 'Templates', files: 15 },
  { name: 'Logos', files: 6 },
];

const MediaLibraryPage = () => {
  return (
    <>
      <TopBar title="Biblioteca de Mídia" subtitle="Gerencie imagens, vídeos e templates" />
      <div className="p-6">
        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar arquivos..."
            className="w-full h-10 pl-9 pr-4 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>

        {/* Folders */}
        <h2 className="text-sm font-semibold text-foreground mb-3">Pastas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
          {folders.map(f => (
            <div key={f.name} className="bg-card border border-border rounded-xl p-4 hover:shadow-sm hover:border-primary/20 transition-all cursor-pointer">
              <FolderOpen size={28} className="text-primary mb-2" />
              <p className="text-sm font-medium text-foreground truncate">{f.name}</p>
              <p className="text-xs text-muted-foreground">{f.files} arquivos</p>
            </div>
          ))}
        </div>

        {/* Placeholder grid */}
        <h2 className="text-sm font-semibold text-foreground mb-3">Arquivos Recentes</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-square bg-secondary rounded-lg flex items-center justify-center hover:bg-accent transition-colors cursor-pointer">
              <Image size={24} className="text-muted-foreground/40" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default MediaLibraryPage;
