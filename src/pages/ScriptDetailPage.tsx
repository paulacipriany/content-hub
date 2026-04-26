import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { useClientFromUrl } from '@/hooks/useClientFromUrl';
import { supabase } from '@/integrations/supabase/client';
import ScriptEditor from '@/components/scripts/ScriptEditor';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const ScriptDetailPage = () => {
  useClientFromUrl();
  const { scriptId } = useParams<{ scriptId: string }>();
  const navigate = useNavigate();
  const { selectedProject } = useApp();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('saved');
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!scriptId) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('project_scripts' as any)
        .select('*')
        .eq('id', scriptId)
        .single();
      if (error || !data) {
        toast.error('Roteiro não encontrado');
        if (selectedProject) navigate(`/clients/${selectedProject.id}/scripts`);
        return;
      }
      setTitle((data as any).title);
      setContent((data as any).content);
      setLoading(false);
    };
    load();
  }, [scriptId]);

  const persist = useCallback(async (newTitle: string, newContent: any) => {
    if (!scriptId) return;
    setSaveStatus('saving');
    const { error } = await supabase
      .from('project_scripts' as any)
      .update({ title: newTitle, content: newContent } as any)
      .eq('id', scriptId);
    if (error) {
      setSaveStatus('idle');
      toast.error('Erro ao salvar');
      return;
    }
    setSaveStatus('saved');
  }, [scriptId]);

  const scheduleSave = useCallback((newTitle: string, newContent: any) => {
    setSaveStatus('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => persist(newTitle, newContent), 800);
  }, [persist]);

  const handleTitleChange = (v: string) => {
    setTitle(v);
    scheduleSave(v, content);
  };

  const handleContentChange = (v: any) => {
    setContent(v);
    scheduleSave(title, v);
  };

  if (!selectedProject) return null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Carregando roteiro...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Custom topbar */}
      <div className="flex items-center gap-3 px-6 h-14 border-b border-border bg-card flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/clients/${selectedProject.id}/scripts`)}
          className="gap-1.5 -ml-2"
        >
          <ArrowLeft size={16} />
          Voltar
        </Button>
        <div className="w-px h-6 bg-border" />
        <Input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="flex-1 max-w-md border-0 shadow-none bg-transparent text-base font-medium focus-visible:ring-1 focus-visible:ring-primary/30 px-2"
          placeholder="Título do documento"
        />
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {saveStatus === 'saving' ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              <span>Salvando...</span>
            </>
          ) : saveStatus === 'saved' ? (
            <>
              <Check size={13} className="text-emerald-500" />
              <span>Salvo</span>
            </>
          ) : null}
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-4">
        <ScriptEditor
          scriptId={scriptId}
          content={content}
          onChange={handleContentChange}
        />
      </div>
    </div>
  );
};

export default ScriptDetailPage;
