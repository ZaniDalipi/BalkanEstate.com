import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/src/components/ui/button';

interface ReviewPublishConfirmProps {
  count: number;
  onCheck: () => void;
  onPublish: () => void;
  onCancel: () => void;
}

/** Asked when Publish is pressed while automatically placed regions are unchecked: check them first, or publish anyway. */
export const ReviewPublishConfirm: React.FC<ReviewPublishConfirmProps> = ({ count, onCheck, onPublish, onCancel }) => {
  const { t } = useTranslation('developments');
  return (
    <div role="alert" className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-sm text-amber-900">
      <p className="min-w-[12rem] flex-1">
        {t('editor.review.confirmPublish', { count, defaultValue: '{{count}} automatically placed regions are not checked yet. Visitors will see them exactly where they are now.' })}
      </p>
      <Button size="sm" className="min-h-[44px] sm:min-h-0" onClick={onCheck}>{t('editor.review.checkFirst', 'Check them first')}</Button>
      <Button size="sm" variant="outline" className="min-h-[44px] sm:min-h-0" onClick={onPublish}>{t('editor.review.publishAnyway', 'Publish anyway')}</Button>
      <Button size="sm" variant="ghost" className="min-h-[44px] sm:min-h-0" onClick={onCancel}>{t('editor.review.cancel', 'Cancel')}</Button>
    </div>
  );
};
