import { useState, useCallback } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface UseConfirmDeleteReturn {
  confirmDelete: (onConfirm: () => void | Promise<void>, itemName?: string) => void;
  ConfirmDialog: React.FC;
}

export function useConfirmDelete(): UseConfirmDeleteReturn {
  const [open, setOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void | Promise<void>) | null>(null);
  const [itemName, setItemName] = useState('este item');

  const confirmDelete = useCallback((onConfirm: () => void | Promise<void>, name?: string) => {
    setPendingAction(() => onConfirm);
    setItemName(name ?? 'este item');
    setOpen(true);
  }, []);

  const handleConfirm = async () => {
    if (pendingAction) await pendingAction();
    setOpen(false);
    setPendingAction(null);
  };

  const ConfirmDialog = () => (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir {itemName}? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirmDelete, ConfirmDialog };
}
