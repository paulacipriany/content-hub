import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Link as LinkIcon, Image as ImageIcon, List, ListOrdered, ListChecks,
  Heading1, Heading2, Heading3, Quote, Code, Minus,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Undo, Redo, Highlighter, Table as TableIcon, Palette,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ScriptEditorProps {
  content: any;
  onChange: (json: any) => void;
  scriptId?: string;
}

const COLORS = ['#000000', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#ffffff'];
const HIGHLIGHTS = ['#fef3c7', '#fee2e2', '#dcfce7', '#dbeafe', '#f3e8ff', '#fce7f3', 'transparent'];

const ScriptEditor = ({ content, onChange, scriptId }: ScriptEditorProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-primary underline cursor-pointer' } }),
      Image.configure({ HTMLAttributes: { class: 'rounded-lg max-w-full my-2' } }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder: 'Comece a escrever seu roteiro...' }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base max-w-none text-foreground focus:outline-none min-h-[60vh] px-16 py-12',
      },
    },
  });

  const initializedRef = useRef(false);
  useEffect(() => {
    if (editor && !initializedRef.current) {
      editor.commands.setContent(content || '');
      initializedRef.current = true;
    }
  }, [editor]);

  useEffect(() => {
    initializedRef.current = false;
  }, [scriptId]);

  const addLink = () => {
    const url = window.prompt('URL do link:');
    if (url && editor) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  };

  const addImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    const toastId = toast.loading('Enviando imagem...');
    try {
      const ext = file.name.split('.').pop();
      const path = `scripts/${scriptId || 'common'}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('content-media').upload(path, file);
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('content-media').getPublicUrl(path);
        editor.chain().focus().setImage({ src: publicUrl }).run();
        toast.success('Imagem enviada!', { id: toastId });
      } else {
        toast.error('Erro: ' + error.message, { id: toastId });
      }
    } catch (err) {
      toast.error('Erro no upload', { id: toastId });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!editor) return null;

  const ToolBtn = ({ active, onClick, children, title, disabled }: { active?: boolean; onClick: () => void; children: React.ReactNode; title?: string; disabled?: boolean }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={cn(
        "w-8 h-8 rounded flex items-center justify-center transition-colors",
        active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
        disabled && "opacity-40 cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );

  const Divider = () => <div className="w-px h-5 bg-border mx-1" />;

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-background flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-3 py-2 border-b border-border bg-card flex-wrap sticky top-0 z-10">
        <ToolBtn onClick={() => editor.chain().focus().undo().run()} title="Desfazer" disabled={!editor.can().undo()}>
          <Undo size={15} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} title="Refazer" disabled={!editor.can().redo()}>
          <Redo size={15} />
        </ToolBtn>
        <Divider />
        <ToolBtn active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Título 1">
          <Heading1 size={15} />
        </ToolBtn>
        <ToolBtn active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Título 2">
          <Heading2 size={15} />
        </ToolBtn>
        <ToolBtn active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Título 3">
          <Heading3 size={15} />
        </ToolBtn>
        <Divider />
        <ToolBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Negrito">
          <Bold size={15} />
        </ToolBtn>
        <ToolBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Itálico">
          <Italic size={15} />
        </ToolBtn>
        <ToolBtn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Sublinhado">
          <UnderlineIcon size={15} />
        </ToolBtn>
        <ToolBtn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Tachado">
          <Strikethrough size={15} />
        </ToolBtn>
        <Popover>
          <PopoverTrigger asChild>
            <button className="w-8 h-8 rounded flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground" title="Cor do texto">
              <Palette size={15} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <div className="grid grid-cols-5 gap-1">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => editor.chain().focus().setColor(c).run()}
                  className="w-6 h-6 rounded border border-border"
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <button className="w-8 h-8 rounded flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground" title="Cor de fundo">
              <Highlighter size={15} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <div className="grid grid-cols-4 gap-1">
              {HIGHLIGHTS.map(c => (
                <button
                  key={c}
                  onClick={() => c === 'transparent' ? editor.chain().focus().unsetHighlight().run() : editor.chain().focus().toggleHighlight({ color: c }).run()}
                  className="w-6 h-6 rounded border border-border"
                  style={{ backgroundColor: c === 'transparent' ? 'white' : c, backgroundImage: c === 'transparent' ? 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc)' : undefined, backgroundSize: c === 'transparent' ? '6px 6px' : undefined }}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <Divider />
        <ToolBtn active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Alinhar à esquerda">
          <AlignLeft size={15} />
        </ToolBtn>
        <ToolBtn active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Centralizar">
          <AlignCenter size={15} />
        </ToolBtn>
        <ToolBtn active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Alinhar à direita">
          <AlignRight size={15} />
        </ToolBtn>
        <ToolBtn active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()} title="Justificar">
          <AlignJustify size={15} />
        </ToolBtn>
        <Divider />
        <ToolBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Lista">
          <List size={15} />
        </ToolBtn>
        <ToolBtn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Lista numerada">
          <ListOrdered size={15} />
        </ToolBtn>
        <ToolBtn active={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()} title="Lista de tarefas">
          <ListChecks size={15} />
        </ToolBtn>
        <Divider />
        <ToolBtn active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Citação">
          <Quote size={15} />
        </ToolBtn>
        <ToolBtn active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Bloco de código">
          <Code size={15} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Linha divisória">
          <Minus size={15} />
        </ToolBtn>
        <Divider />
        <ToolBtn active={editor.isActive('link')} onClick={addLink} title="Link">
          <LinkIcon size={15} />
        </ToolBtn>
        <ToolBtn onClick={() => fileInputRef.current?.click()} title="Imagem">
          <ImageIcon size={15} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Tabela">
          <TableIcon size={15} />
        </ToolBtn>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={addImage}
          accept="image/*"
        />
      </div>

      <div className="flex-1 overflow-y-auto bg-muted/30">
        <div className="max-w-[850px] mx-auto my-6 bg-background shadow-sm border border-border rounded-sm">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
};

export default ScriptEditor;
