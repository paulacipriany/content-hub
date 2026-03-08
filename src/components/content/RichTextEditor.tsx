import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import { Bold, Italic, Underline as UnderlineIcon, Link as LinkIcon, Image as ImageIcon, List, ListOrdered, Heading2, Undo, Redo } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  contentId?: string;
}

const RichTextEditor = ({ content, onChange, contentId }: RichTextEditorProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-primary underline cursor-pointer' } }),
      Image.configure({ HTMLAttributes: { class: 'rounded-lg max-w-full my-2' } }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none text-foreground focus:outline-none min-h-[200px] p-3',
      },
    },
  });

  // Sync content from outside only on initial load / content ID change
  const initializedRef = useRef(false);
  useEffect(() => {
    if (editor && !initializedRef.current) {
      editor.commands.setContent(content || '');
      initializedRef.current = true;
    }
  }, [editor]);

  useEffect(() => {
    initializedRef.current = false;
  }, [contentId]);

  useEffect(() => {
    if (editor && !initializedRef.current) {
      editor.commands.setContent(content || '');
      initializedRef.current = true;
    }
  }, [contentId, editor]);

  const addLink = () => {
    const url = window.prompt('URL do link:');
    if (url && editor) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  };

  const addImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor || !contentId) return;
    try {
      const ext = file.name.split('.').pop();
      const path = `${contentId}/briefing/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('content-media').upload(path, file);
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('content-media').getPublicUrl(path);
        editor.chain().focus().setImage({ src: publicUrl }).run();
      }
    } catch (err) {
      console.error('Image upload error:', err);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!editor) return null;

  const ToolBtn = ({ active, onClick, children, title }: { active?: boolean; onClick: () => void; children: React.ReactNode; title?: string }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "w-8 h-8 rounded flex items-center justify-center transition-colors",
        active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
    >
      {children}
    </button>
  );

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-secondary/30">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-card flex-wrap">
        <ToolBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Negrito">
          <Bold size={14} />
        </ToolBtn>
        <ToolBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Itálico">
          <Italic size={14} />
        </ToolBtn>
        <ToolBtn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Sublinhado">
          <UnderlineIcon size={14} />
        </ToolBtn>
        <div className="w-px h-5 bg-border mx-1" />
        <ToolBtn active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Título">
          <Heading2 size={14} />
        </ToolBtn>
        <ToolBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Lista">
          <List size={14} />
        </ToolBtn>
        <ToolBtn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Lista numerada">
          <ListOrdered size={14} />
        </ToolBtn>
        <div className="w-px h-5 bg-border mx-1" />
        <ToolBtn active={editor.isActive('link')} onClick={addLink} title="Link">
          <LinkIcon size={14} />
        </ToolBtn>
        <div className="w-px h-5 bg-border mx-1" />
        <ToolBtn onClick={() => editor.chain().focus().undo().run()} title="Desfazer">
          <Undo size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} title="Refazer">
          <Redo size={14} />
        </ToolBtn>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
};

export default RichTextEditor;
