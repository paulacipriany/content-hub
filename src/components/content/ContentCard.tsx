import { useState } from 'react';
import { ContentWithRelations, STATUS_LABELS, STATUS_COLORS, CONTENT_TYPE_LABELS, WorkflowStatus, ContentType } from '@/data/types';
import { useApp } from '@/contexts/AppContext';
import { cn } from '@/lib/utils';
import { platformIcon } from './PlatformIcons';
import { Pencil, Trash2, GripVertical } from 'lucide-react';
import EditContentDialog from './EditContentDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface ContentCardProps {
  content: ContentWithRelations;
  compact?: boolean;
  hideStatus?: boolean;
  readOnly?: boolean;
  onClick?: () => void;
  dragHandleProps?: any;
}

const ContentCard = ({ content, compact, hideStatus, readOnly, onClick, dragHandleProps }: ContentCardProps) => {
  const { setSelectedContent, deleteContent } = useApp();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const assigneeName = content.assignee_profile?.display_name ?? 'Sem responsável';
  const initials = assigneeName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    await deleteContent(content.id);
    setDeleteOpen(false);
  };

  if (compact) {
    return (
      <button
        onClick={() => setSelectedContent(content)}
        className="w-full text-left p-2 rounded-md bg-card border border-border hover:shadow-sm transition-all text-xs group"
        style={{ borderColor: 'var(--client-100, hsl(var(--border)))' }}
      >
        <div className="flex items-center gap-1.5 mb-1">
          {platformIcon(content.platform, 12)}
          <span className="font-medium text-foreground truncate">{content.title}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_COLORS[content.status as WorkflowStatus])} />
          <span className="text-muted-foreground truncate">{STATUS_LABELS[content.status as WorkflowStatus]}</span>
        </div>
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => onClick ? onClick() : setSelectedContent(content)}
        className="w-full text-left p-3 rounded-lg bg-card shadow-sm hover:shadow-md transition-all group relative"
        style={{ borderColor: 'var(--client-100, hsl(var(--border)))' }}
      >
        {/* Action icons - visible on hover */}
        {hideStatus && (!readOnly || (readOnly && content.status === 'client-request')) && content.status !== 'published' && (
          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            {dragHandleProps && !readOnly && (
              <div
                {...dragHandleProps}
                className="w-6 h-6 rounded-md flex items-center justify-center bg-muted hover:bg-accent text-muted-foreground hover:text-accent-foreground transition-colors cursor-grab active:cursor-grabbing"
                title="Arrastar"
              >
                <GripVertical size={12} />
              </div>
            )}
            {!readOnly && (
              <button
                onClick={handleEdit}
                className="w-6 h-6 rounded-md flex items-center justify-center bg-muted hover:bg-accent text-muted-foreground hover:text-accent-foreground transition-colors"
                title="Editar"
              >
                <Pencil size={12} />
              </button>
            )}
            <button
              onClick={handleDeleteClick}
              className="w-6 h-6 rounded-md flex items-center justify-center bg-muted hover:bg-destructive text-muted-foreground hover:text-destructive-foreground transition-colors"
              title="Excluir"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}

        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium uppercase" style={{ backgroundColor: '#ff88db', color: '#000000', borderRadius: '5px' }}>
              {CONTENT_TYPE_LABELS[content.content_type as ContentType]}
            </span>
            {platformIcon(content.platform, 14, true)}
          </div>
          {!hideStatus && (
            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-primary-foreground", STATUS_COLORS[content.status as WorkflowStatus])}>
              {STATUS_LABELS[content.status as WorkflowStatus]}
            </span>
          )}
        </div>
        <h3 className="text-sm font-medium text-foreground mb-1.5 transition-colors" style={{ '--hover-color': 'var(--client-500)' } as React.CSSProperties}>{content.title}</h3>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{content.description?.replace(/<[^>]*>/g, '')}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--client-100, hsl(var(--primary) / 0.1))' }}
            >
              <span className="text-[10px] font-medium" style={{ color: 'var(--client-600, hsl(var(--primary)))' }}>{initials}</span>
            </div>
            <span className="text-xs text-muted-foreground">{assigneeName.split(' ')[0]}</span>
          </div>
          {content.publish_date && (
            <span className="text-xs text-muted-foreground">
              {new Date(content.publish_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            </span>
          )}
        </div>
      </button>

      <EditContentDialog content={content} open={editOpen} onOpenChange={setEditOpen} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conteúdo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{content.title}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ContentCard;
