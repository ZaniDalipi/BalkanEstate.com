import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfirmation } from './useConfirmation';

/**
 * Closing an edit dialog that has unsaved changes asks first ("Discard your
 * changes?"), whichever way it is closed — clicking outside, Esc, ×, Cancel.
 * Without changes it closes at once. While the question is open, further
 * close attempts (the same Esc reaching the dialog underneath) are ignored.
 *
 *   const requestClose = useGuardedClose(form.dirty, onClose);
 *   <Modal onClose={requestClose}> … <Button onClick={requestClose}>Cancel</Button>
 */
export function useGuardedClose(dirty: boolean, onClose: () => void): () => Promise<void> {
  const { t } = useTranslation('common');
  const { confirm } = useConfirmation();
  const asking = useRef(false);

  return useCallback(async () => {
    if (!dirty) {
      onClose();
      return;
    }
    if (asking.current) return;
    asking.current = true;
    try {
      const discard = await confirm({
        title: t('unsaved.title', 'Discard your changes?'),
        message: t('unsaved.message', 'You have changes that are not saved yet. If you close now, they are lost.'),
        confirmLabel: t('unsaved.discard', 'Discard changes'),
        cancelLabel: t('unsaved.keep', 'Keep editing'),
        type: 'warning',
      });
      if (discard) onClose();
    } finally {
      asking.current = false;
    }
  }, [dirty, onClose, confirm, t]);
}
