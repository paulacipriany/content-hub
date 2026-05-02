import { useNavigate } from 'react-router-dom';
import TopBar from '@/components/layout/TopBar';
import { useTheme } from 'next-themes';
import { ArrowLeft, Sun, Moon, Monitor, Type, Maximize2, Minimize2 } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useApp } from '@/contexts/AppContext';

const SettingsAppearancePage = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { sidebarCollapsed, setSidebarCollapsed } = useApp();
  const [fontSize, setFontSize] = useState<'small' | 'default' | 'large'>('default');
  const sidebarCompact = sidebarCollapsed;
  const setSidebarCompact = (v: boolean) => {
    setSidebarCollapsed(v);
    try { localStorage.setItem('sidebarCollapsed', v ? '1' : '0'); } catch {}
  };

  const themes = [
    { key: 'light', label: 'Claro', icon: Sun, desc: 'Modo claro com fundo branco' },
    { key: 'dark', label: 'Escuro', icon: Moon, desc: 'Modo escuro para ambientes escuros' },
    { key: 'system', label: 'Sistema', icon: Monitor, desc: 'Segue a preferência do sistema' },
  ];

  const fontSizes = [
    { key: 'small' as const, label: 'Pequeno', icon: Minimize2 },
    { key: 'default' as const, label: 'Padrão', icon: Type },
    { key: 'large' as const, label: 'Grande', icon: Maximize2 },
  ];

  const handleSave = () => {
    toast({ title: 'Preferências de aparência salvas' });
  };

  return (
    <>
      <TopBar
        title="Aparência"
        subtitle="Tema e personalização da plataforma"
        actions={
          <Button onClick={handleSave} className="btn-action-primary" size="sm">
            SALVAR
          </Button>
        }
      />
      <div className="p-6 max-w-3xl space-y-8">
        {/* Back */}
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} />
          Voltar para configurações
        </button>

        {/* Theme section */}
        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Tema</h2>
            <p className="text-xs text-muted-foreground">Escolha o tema de aparência da plataforma</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {themes.map(t => {
              const active = theme === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTheme(t.key)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    active
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border bg-card hover:border-primary/30 hover:shadow-sm'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${active ? 'bg-primary/15' : 'bg-secondary'}`}>
                    <t.icon size={20} className={active ? 'text-primary' : 'text-muted-foreground'} />
                  </div>
                  <p className="text-sm font-medium text-foreground">{t.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                  {active && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span className="text-[10px] font-medium text-primary uppercase">Ativo</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Font size section */}
        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Tamanho da fonte</h2>
            <p className="text-xs text-muted-foreground">Ajuste o tamanho padrão dos textos da plataforma</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {fontSizes.map(f => {
              const active = fontSize === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setFontSize(f.key)}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center ${
                    active
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border bg-card hover:border-primary/30'
                  }`}
                >
                  <f.icon size={20} className={active ? 'text-primary' : 'text-muted-foreground'} />
                  <p className={`text-sm font-medium mt-2 ${active ? 'text-primary' : 'text-foreground'}`}>{f.label}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Layout section */}
        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Layout</h2>
            <p className="text-xs text-muted-foreground">Opções de layout da interface</p>
          </div>
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            {/* Compact sidebar */}
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-foreground">Sidebar compacta</p>
                <p className="text-xs text-muted-foreground">Reduz o tamanho da barra lateral</p>
              </div>
              <button
                onClick={() => setSidebarCompact(!sidebarCompact)}
                className={`relative w-9 h-5 rounded-full transition-colors ${sidebarCompact ? 'bg-primary' : 'bg-muted-foreground/20'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${sidebarCompact ? 'translate-x-4' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Pré-visualização</h2>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                <Sun size={18} className="text-primary" />
              </div>
              <div>
                <p className={`font-semibold text-foreground ${fontSize === 'small' ? 'text-xs' : fontSize === 'large' ? 'text-base' : 'text-sm'}`}>
                  Exemplo de título
                </p>
                <p className={`text-muted-foreground ${fontSize === 'small' ? 'text-[10px]' : fontSize === 'large' ? 'text-sm' : 'text-xs'}`}>
                  Este é um texto de exemplo para demonstrar as configurações de aparência.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-medium">Tag exemplo</span>
              <span className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-medium">Status OK</span>
              <span className="px-2 py-1 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-medium">Em revisão</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsAppearancePage;
