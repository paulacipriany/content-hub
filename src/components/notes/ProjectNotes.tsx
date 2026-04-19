import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Pin, PinOff, Trash2, Image as ImageIcon, ListChecks, Type, X, Plus, Check, Loader2, Palette, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/* Renders text supporting markdown links [text](url) and raw URLs */
const MD_LINK_REGEX = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
const RAW_URL_REGEX = /(https?:\/\/[^\s)]+)/g;

const renderLinkPart = (key: string | number, href: string, label: string) => (
  <a
    key={key}
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    onClick={(e) => e.stopPropagation()}
    className="underline text-primary hover:opacity-80 break-all"
  >
    {label}
  </a>
);

const linkifyRawUrls = (text: string, prefix: string): React.ReactNode[] => {
  if (!text) return [];
  const parts = text.split(RAW_URL_REGEX);
  return parts.map((part, i) => {
    if (RAW_URL_REGEX.test(part)) {
      RAW_URL_REGEX.lastIndex = 0;
      return renderLinkPart(`${prefix}${i}`, part, part);
    }
    return <span key={`${prefix}${i}`}>{part}</span>;
  });
};

const linkifyText = (text: string): React.ReactNode => {
  if (!text) return text;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  const re = new RegExp(MD_LINK_REGEX.source, 'g');
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(...linkifyRawUrls(text.slice(lastIndex, match.index), `${key}-pre-`));
    }
    nodes.push(renderLinkPart(`md-${key}`, match[2], match[1]));
    lastIndex = match.index + match[0].length;
    key++;
  }
  if (lastIndex < text.length) {
    nodes.push(...linkifyRawUrls(text.slice(lastIndex), `${key}-post-`));
  }
  return nodes;
};

/* Inserts a markdown link at selection inside an input/textarea */
const insertLinkInField = (
  el: HTMLInputElement | HTMLTextAreaElement | null,
  currentValue: string
): { value: string; caret: number } | null => {
  const selStart = el?.selectionStart ?? currentValue.length;
  const selEnd = el?.selectionEnd ?? currentValue.length;
  const selectedText = currentValue.slice(selStart, selEnd);

  let label = selectedText;
  if (!label) {
    const t = window.prompt('Texto a exibir:');
    if (t === null) return null;
    label = t.trim();
    if (!label) return null;
  }
  const url = window.prompt('URL do link (ex: https://...)');
  if (!url) return null;
  const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  const insert = `[${label}](${normalized})`;
  const newValue = currentValue.slice(0, selStart) + insert + currentValue.slice(selEnd);
  return { value: newValue, caret: selStart + insert.length };
};

type NoteType = 'note' | 'checklist';

interface NoteItem {
  id: string;
  note_id: string;
  text: string;
  done: boolean;
  sort_order: number;
}

interface ProjectNote {
  id: string;
  project_id: string;
  created_by: string;
  title: string;
  content: string;
  color: string;
  type: NoteType;
  image_url: string | null;
  pinned: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  items?: NoteItem[];
}

const COLORS = [
  { name: 'Padrão', value: '#ffffff', dark: '#1f1f1f' },
  { name: 'Vermelho', value: '#faafa8', dark: '#5c2b29' },
  { name: 'Laranja', value: '#f39f76', dark: '#614a19' },
  { name: 'Amarelo', value: '#fff8b8', dark: '#635d19' },
  { name: 'Verde', value: '#e2f6d3', dark: '#345920' },
  { name: 'Azul', value: '#cbf0f8', dark: '#16504b' },
  { name: 'Indigo', value: '#aecbfa', dark: '#2d555e' },
  { name: 'Roxo', value: '#d7aefb', dark: '#42275e' },
  { name: 'Rosa', value: '#fdcfe8', dark: '#5b2245' },
  { name: 'Cinza', value: '#e8eaed', dark: '#3c3f43' },
];

const getEffectiveColor = (color: string) => {
  const isDark = document.documentElement.classList.contains('dark');
  const found = COLORS.find(c => c.value === color);
  return isDark ? (found?.dark ?? '#1f1f1f') : (found?.value ?? '#ffffff');
};

interface ProjectNotesProps {
  projectId: string;
}

const ProjectNotes = ({ projectId }: ProjectNotesProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<ProjectNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createType, setCreateType] = useState<NoteType>('note');
  const [editingNote, setEditingNote] = useState<ProjectNote | null>(null);
  const [, forceRender] = useState(0);

  // Watch for theme changes to re-render colors
  useEffect(() => {
    const observer = new MutationObserver(() => forceRender(n => n + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    const { data: notesData } = await supabase
      .from('project_notes')
      .select('*')
      .eq('project_id', projectId)
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false });

    if (notesData && notesData.length > 0) {
      const ids = notesData.map((n: any) => n.id);
      const { data: itemsData } = await supabase
        .from('project_note_items')
        .select('*')
        .in('note_id', ids)
        .order('sort_order', { ascending: true });

      const grouped = (notesData as any[]).map(n => ({
        ...n,
        items: (itemsData ?? []).filter((i: any) => i.note_id === n.id),
      })) as ProjectNote[];
      setNotes(grouped);
    } else {
      setNotes([]);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const handleCreate = async (data: { title: string; content: string; color: string; type: NoteType; image_url: string | null; items: { text: string; done: boolean }[] }) => {
    if (!user) return;
    const hasContent = data.title.trim() || data.content.trim() || data.image_url || data.items.some(i => i.text.trim());
    if (!hasContent) {
      setShowCreate(false);
      return;
    }

    const { data: created, error } = await supabase
      .from('project_notes')
      .insert({
        project_id: projectId,
        created_by: user.id,
        title: data.title,
        content: data.content,
        color: data.color,
        type: data.type,
        image_url: data.image_url,
      })
      .select()
      .single();

    if (error || !created) {
      toast({ title: 'Erro ao criar nota', description: error?.message, variant: 'destructive' });
      return;
    }

    if (data.type === 'checklist' && data.items.length > 0) {
      const itemsToInsert = data.items
        .filter(i => i.text.trim())
        .map((i, idx) => ({ note_id: created.id, text: i.text, done: i.done, sort_order: idx }));
      if (itemsToInsert.length > 0) {
        await supabase.from('project_note_items').insert(itemsToInsert);
      }
    }

    setShowCreate(false);
    await fetchNotes();
  };

  const handleUpdate = async (note: ProjectNote, patch: Partial<ProjectNote>) => {
    const { error } = await supabase.from('project_notes').update(patch).eq('id', note.id);
    if (error) {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    } else {
      setNotes(prev => prev.map(n => n.id === note.id ? { ...n, ...patch } : n));
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('project_notes').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } else {
      setNotes(prev => prev.filter(n => n.id !== id));
      setEditingNote(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pinnedNotes = notes.filter(n => n.pinned);
  const otherNotes = notes.filter(n => !n.pinned);

  return (
    <div className="space-y-6">
      {/* Quick create */}
      {!showCreate ? (
        <div className="max-w-xl mx-auto">
          <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-3 shadow-sm hover:shadow transition-shadow">
            <button
              onClick={() => { setCreateType('note'); setShowCreate(true); }}
              className="flex-1 text-left text-sm text-muted-foreground"
            >
              Criar uma nota...
            </button>
            <button
              onClick={() => { setCreateType('checklist'); setShowCreate(true); }}
              className="p-1.5 rounded hover:bg-accent text-muted-foreground"
              title="Nova lista"
            >
              <ListChecks size={16} />
            </button>
            <button
              onClick={() => { setCreateType('note'); setShowCreate(true); }}
              className="p-1.5 rounded hover:bg-accent text-muted-foreground"
              title="Nova nota"
            >
              <Type size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-xl mx-auto">
          <NoteEditor
            initialType={createType}
            onSave={handleCreate}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      )}

      {pinnedNotes.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">Fixadas</p>
          <NotesGrid notes={pinnedNotes} onUpdate={handleUpdate} onDelete={handleDelete} onOpen={setEditingNote} onRefresh={fetchNotes} />
        </div>
      )}

      {otherNotes.length > 0 && (
        <div>
          {pinnedNotes.length > 0 && <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">Outras</p>}
          <NotesGrid notes={otherNotes} onUpdate={handleUpdate} onDelete={handleDelete} onOpen={setEditingNote} onRefresh={fetchNotes} />
        </div>
      )}

      {notes.length === 0 && !showCreate && (
        <div className="text-center py-20 text-muted-foreground">
          <Type size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma anotação ainda.</p>
          <p className="text-xs mt-1">Crie sua primeira nota acima!</p>
        </div>
      )}

      {editingNote && (
        <NoteEditDialog
          note={editingNote}
          onClose={() => setEditingNote(null)}
          onSaved={fetchNotes}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
};

/* ---------- Notes Grid ---------- */

interface NotesGridProps {
  notes: ProjectNote[];
  onUpdate: (note: ProjectNote, patch: Partial<ProjectNote>) => void;
  onDelete: (id: string) => void;
  onOpen: (note: ProjectNote) => void;
  onRefresh: () => void;
}

const NotesGrid = ({ notes, onUpdate, onDelete, onOpen, onRefresh }: NotesGridProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {notes.map(note => (
        <NoteCard key={note.id} note={note} onUpdate={onUpdate} onDelete={onDelete} onOpen={onOpen} onRefresh={onRefresh} />
      ))}
    </div>
  );
};

/* ---------- Note Card ---------- */

interface NoteCardProps {
  note: ProjectNote;
  onUpdate: (note: ProjectNote, patch: Partial<ProjectNote>) => void;
  onDelete: (id: string) => void;
  onOpen: (note: ProjectNote) => void;
  onRefresh: () => void;
}

const NoteCard = ({ note, onUpdate, onDelete, onOpen, onRefresh }: NoteCardProps) => {
  const [showColors, setShowColors] = useState(false);

  const toggleItemDone = async (item: NoteItem) => {
    await supabase.from('project_note_items').update({ done: !item.done }).eq('id', item.id);
    onRefresh();
  };

  return (
    <div
      className="group relative rounded-xl border border-border overflow-hidden transition-all hover:shadow-md cursor-pointer"
      style={{ backgroundColor: getEffectiveColor(note.color) }}
      onClick={() => onOpen(note)}
    >
      {/* Pin button */}
      <button
        onClick={(e) => { e.stopPropagation(); onUpdate(note, { pinned: !note.pinned }); }}
        className="absolute top-2 right-2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/10 dark:hover:bg-white/10 z-10"
        title={note.pinned ? 'Desfixar' : 'Fixar'}
      >
        {note.pinned ? <Pin size={14} className="fill-current" /> : <PinOff size={14} />}
      </button>

      {note.image_url && (
        <div className="w-full max-h-48 overflow-hidden">
          <img src={note.image_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="p-3 space-y-2">
        {note.title && <h3 className="text-sm font-semibold text-foreground pr-7 line-clamp-2">{note.title}</h3>}

        {note.type === 'note' && note.content && (
          <p className="text-xs text-foreground/80 whitespace-pre-wrap line-clamp-6">{linkifyText(note.content)}</p>
        )}

        {note.type === 'checklist' && note.items && note.items.length > 0 && (
          <div className="space-y-1">
            {note.items.slice(0, 8).map(item => (
              <div key={item.id} className="flex items-center gap-2 text-xs" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => toggleItemDone(item)}
                  className={cn(
                    "w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0",
                    item.done ? 'bg-foreground border-foreground' : 'border-foreground/40'
                  )}
                >
                  {item.done && <Check size={10} className="text-background" />}
                </button>
                <span className={cn("text-foreground/80 break-words", item.done && "line-through opacity-60")}>{linkifyText(item.text)}</span>
              </div>
            ))}
            {note.items.length > 8 && (
              <p className="text-[10px] text-foreground/60">+ {note.items.length - 8} item(s)</p>
            )}
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowColors(!showColors); }}
              className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
              title="Cor"
            >
              <Palette size={13} />
            </button>
            {showColors && (
              <div
                className="absolute bottom-full left-0 mb-1 bg-popover border border-border rounded-lg p-1.5 flex gap-1 flex-wrap w-40 z-20 shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                {COLORS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => { onUpdate(note, { color: c.value }); setShowColors(false); }}
                    className={cn(
                      "w-5 h-5 rounded-full border-2 transition-transform hover:scale-110",
                      note.color === c.value ? 'border-foreground' : 'border-transparent'
                    )}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); if (confirm('Excluir esta nota?')) onDelete(note.id); }}
            className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-foreground/70 hover:text-destructive"
            title="Excluir"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---------- Inline Note Editor (for create) ---------- */

interface NoteEditorProps {
  initialType: NoteType;
  onSave: (data: { title: string; content: string; color: string; type: NoteType; image_url: string | null; items: { text: string; done: boolean }[] }) => void;
  onCancel: () => void;
}

const NoteEditor = ({ initialType, onSave, onCancel }: NoteEditorProps) => {
  const [type, setType] = useState<NoteType>(initialType);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState('#ffffff');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [items, setItems] = useState<{ text: string; done: boolean }[]>([{ text: '', done: false }]);
  const [showColors, setShowColors] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLInputElement | null)[]>([]);
  const focusIndexRef = useRef<number | null>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const lastFocusedItemRef = useRef<number>(0);

  useEffect(() => {
    if (focusIndexRef.current !== null) {
      itemRefs.current[focusIndexRef.current]?.focus();
      focusIndexRef.current = null;
    }
  }, [items]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('note-images').upload(path, file);
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('note-images').getPublicUrl(path);
      setImageUrl(publicUrl);
    }
    setUploading(false);
  };

  return (
    <div
      className="rounded-xl border border-border shadow-md overflow-hidden"
      style={{ backgroundColor: getEffectiveColor(color) }}
    >
      {imageUrl && (
        <div className="relative">
          <img src={imageUrl} alt="" className="w-full max-h-64 object-cover" />
          <button
            onClick={() => setImageUrl(null)}
            className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black/80"
          >
            <X size={14} />
          </button>
        </div>
      )}
      <div className="p-3 space-y-2">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Título"
          className="w-full bg-transparent text-sm font-semibold text-foreground placeholder:text-foreground/50 outline-none"
          autoFocus
        />

        {type === 'note' ? (
          <textarea
            ref={contentRef}
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Criar uma nota..."
            rows={4}
            className="w-full bg-transparent text-sm text-foreground placeholder:text-foreground/50 outline-none resize-none"
          />
        ) : (
          <div className="space-y-1">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <button
                  onClick={() => setItems(items.map((it, i) => i === idx ? { ...it, done: !it.done } : it))}
                  className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0",
                    item.done ? 'bg-foreground border-foreground' : 'border-foreground/40'
                  )}
                >
                  {item.done && <Check size={10} className="text-background" />}
                </button>
                <input
                  ref={el => (itemRefs.current[idx] = el)}
                  value={item.text}
                  onFocus={() => { lastFocusedItemRef.current = idx; }}
                  onChange={e => setItems(items.map((it, i) => i === idx ? { ...it, text: e.target.value } : it))}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const newItems = [...items.slice(0, idx + 1), { text: '', done: false }, ...items.slice(idx + 1)];
                      focusIndexRef.current = idx + 1;
                      setItems(newItems);
                    } else if (e.key === 'Backspace' && item.text === '' && items.length > 1) {
                      e.preventDefault();
                      focusIndexRef.current = Math.max(0, idx - 1);
                      setItems(items.filter((_, i) => i !== idx));
                    }
                  }}
                  placeholder="Item da lista"
                  className={cn(
                    "flex-1 bg-transparent text-sm text-foreground placeholder:text-foreground/50 outline-none",
                    item.done && 'line-through opacity-60'
                  )}
                />
                <button
                  onClick={() => setItems(items.filter((_, i) => i !== idx))}
                  className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded text-foreground/60"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <button
              onClick={() => setItems([...items, { text: '', done: false }])}
              className="flex items-center gap-1.5 text-xs text-foreground/60 hover:text-foreground pt-1"
            >
              <Plus size={12} /> Adicionar item
            </button>
          </div>
        )}

        <div className="flex items-center gap-1 pt-2 border-t border-foreground/10">
          <button
            onClick={() => setType(type === 'note' ? 'checklist' : 'note')}
            className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-foreground/70"
            title={type === 'note' ? 'Converter em lista' : 'Converter em nota'}
          >
            {type === 'note' ? <ListChecks size={14} /> : <Type size={14} />}
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-foreground/70"
            title="Adicionar imagem"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />

          <button
            onClick={() => {
              if (type === 'note') {
                const result = insertLinkInField(contentRef.current, content);
                if (!result) return;
                setContent(result.value);
                requestAnimationFrame(() => {
                  contentRef.current?.focus();
                  contentRef.current?.setSelectionRange(result.caret, result.caret);
                });
              } else {
                const idx = lastFocusedItemRef.current;
                const el = itemRefs.current[idx];
                const current = items[idx]?.text ?? '';
                const result = insertLinkInField(el, current);
                if (!result) return;
                setItems(items.map((it, i) => i === idx ? { ...it, text: result.value } : it));
                requestAnimationFrame(() => {
                  itemRefs.current[idx]?.focus();
                  itemRefs.current[idx]?.setSelectionRange(result.caret, result.caret);
                });
              }
            }}
            className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-foreground/70"
            title="Adicionar link"
          >
            <Link2 size={14} />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowColors(!showColors)}
              className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-foreground/70"
              title="Cor"
            >
              <Palette size={14} />
            </button>
            {showColors && (
              <div className="absolute bottom-full left-0 mb-1 bg-popover border border-border rounded-lg p-1.5 flex gap-1 flex-wrap w-40 z-20 shadow-lg">
                {COLORS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => { setColor(c.value); setShowColors(false); }}
                    className={cn(
                      "w-5 h-5 rounded-full border-2 transition-transform hover:scale-110",
                      color === c.value ? 'border-foreground' : 'border-transparent'
                    )}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex-1" />
          <button onClick={onCancel} className="text-xs px-3 py-1 text-foreground/70 hover:text-foreground">
            Cancelar
          </button>
          <button
            onClick={() => onSave({ title, content, color, type, image_url: imageUrl, items })}
            className="text-xs px-3 py-1 rounded font-medium bg-foreground text-background hover:opacity-90"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---------- Note Edit Dialog ---------- */

interface NoteEditDialogProps {
  note: ProjectNote;
  onClose: () => void;
  onSaved: () => void;
  onDelete: (id: string) => void;
}

const NoteEditDialog = ({ note, onClose, onSaved, onDelete }: NoteEditDialogProps) => {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [color, setColor] = useState(note.color);
  const [imageUrl, setImageUrl] = useState<string | null>(note.image_url);
  const [items, setItems] = useState<NoteItem[]>(note.items ?? []);
  const [showColors, setShowColors] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLInputElement | null)[]>([]);
  const focusIndexRef = useRef<number | null>(null);

  useEffect(() => {
    if (focusIndexRef.current !== null) {
      itemRefs.current[focusIndexRef.current]?.focus();
      focusIndexRef.current = null;
    }
  }, [items]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('note-images').upload(path, file);
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('note-images').getPublicUrl(path);
      setImageUrl(publicUrl);
    }
    setUploading(false);
  };

  const handleSave = async () => {
    await supabase.from('project_notes').update({
      title, content, color, image_url: imageUrl,
    }).eq('id', note.id);

    if (note.type === 'checklist') {
      // Delete all and re-insert
      await supabase.from('project_note_items').delete().eq('note_id', note.id);
      const valid = items.filter(i => i.text.trim());
      if (valid.length > 0) {
        await supabase.from('project_note_items').insert(
          valid.map((i, idx) => ({ note_id: note.id, text: i.text, done: i.done, sort_order: idx }))
        );
      }
    }
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={handleSave}>
      <div
        className="w-full max-w-lg rounded-xl border border-border shadow-2xl overflow-hidden"
        style={{ backgroundColor: getEffectiveColor(color) }}
        onClick={e => e.stopPropagation()}
      >
        {imageUrl && (
          <div className="relative">
            <img src={imageUrl} alt="" className="w-full max-h-80 object-cover" />
            <button onClick={() => setImageUrl(null)} className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black/80">
              <X size={14} />
            </button>
          </div>
        )}
        <div className="p-4 space-y-3">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Título"
            className="w-full bg-transparent text-base font-semibold text-foreground placeholder:text-foreground/50 outline-none"
          />

          {note.type === 'note' ? (
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Nota..."
              rows={8}
              className="w-full bg-transparent text-sm text-foreground placeholder:text-foreground/50 outline-none resize-none"
            />
          ) : (
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {items.map((item, idx) => (
                <div key={item.id || idx} className="flex items-center gap-2">
                  <button
                    onClick={() => setItems(items.map((it, i) => i === idx ? { ...it, done: !it.done } : it))}
                    className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0",
                      item.done ? 'bg-foreground border-foreground' : 'border-foreground/40'
                    )}
                  >
                    {item.done && <Check size={10} className="text-background" />}
                  </button>
                  <input
                    ref={el => (itemRefs.current[idx] = el)}
                    value={item.text}
                    onChange={e => setItems(items.map((it, i) => i === idx ? { ...it, text: e.target.value } : it))}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const newItem = { id: crypto.randomUUID(), note_id: note.id, text: '', done: false, sort_order: idx + 1 };
                        const newItems = [...items.slice(0, idx + 1), newItem, ...items.slice(idx + 1)];
                        focusIndexRef.current = idx + 1;
                        setItems(newItems);
                      } else if (e.key === 'Backspace' && item.text === '' && items.length > 1) {
                        e.preventDefault();
                        focusIndexRef.current = Math.max(0, idx - 1);
                        setItems(items.filter((_, i) => i !== idx));
                      }
                    }}
                    placeholder="Item da lista"
                    className={cn(
                      "flex-1 bg-transparent text-sm text-foreground placeholder:text-foreground/50 outline-none",
                      item.done && 'line-through opacity-60'
                    )}
                  />
                  <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded text-foreground/60">
                    <X size={12} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setItems([...items, { id: crypto.randomUUID(), note_id: note.id, text: '', done: false, sort_order: items.length }])}
                className="flex items-center gap-1.5 text-xs text-foreground/60 hover:text-foreground pt-1"
              >
                <Plus size={12} /> Adicionar item
              </button>
            </div>
          )}

          <div className="flex items-center gap-1 pt-2 border-t border-foreground/10">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-foreground/70"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />

            <button
              onClick={() => {
                const url = window.prompt('URL do link (ex: https://...)');
                if (!url) return;
                const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
                if (note.type === 'note') {
                  setContent(prev => prev ? `${prev}\n${normalized}` : normalized);
                } else {
                  setItems(prev => {
                    const lastEmpty = prev.findIndex(i => !i.text.trim());
                    if (lastEmpty >= 0) {
                      return prev.map((it, i) => i === lastEmpty ? { ...it, text: normalized } : it);
                    }
                    return [...prev, { id: crypto.randomUUID(), note_id: note.id, text: normalized, done: false, sort_order: prev.length }];
                  });
                }
              }}
              className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-foreground/70"
              title="Adicionar link"
            >
              <Link2 size={14} />
            </button>

            <div className="relative">
              <button onClick={() => setShowColors(!showColors)} className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-foreground/70">
                <Palette size={14} />
              </button>
              {showColors && (
                <div className="absolute bottom-full left-0 mb-1 bg-popover border border-border rounded-lg p-1.5 flex gap-1 flex-wrap w-40 z-20 shadow-lg">
                  {COLORS.map(c => (
                    <button
                      key={c.value}
                      onClick={() => { setColor(c.value); setShowColors(false); }}
                      className={cn(
                        "w-5 h-5 rounded-full border-2 transition-transform hover:scale-110",
                        color === c.value ? 'border-foreground' : 'border-transparent'
                      )}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => { if (confirm('Excluir esta nota?')) onDelete(note.id); }}
              className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-foreground/70 hover:text-destructive"
            >
              <Trash2 size={14} />
            </button>

            <div className="flex-1" />
            <button onClick={handleSave} className="text-xs px-3 py-1 rounded font-medium bg-foreground text-background hover:opacity-90">
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectNotes;
