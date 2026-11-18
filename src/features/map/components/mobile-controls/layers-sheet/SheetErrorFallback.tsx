import React from 'react';
import { useTranslation } from 'react-i18next';

/** Shown inside the sheet if its content fails: say so and offer the way back to the map. */
const SheetErrorFallback: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useTranslation('common');
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-4 py-8 text-center">
      <p className="text-[15px] font-semibold text-neutral-900">{t('errors.somethingWentWrong', 'Something went wrong')}</p>
      <p className="text-[13px] text-neutral-500">{t('errors.tryAgain', 'Please try again')}</p>
      <button
        type="button"
        onClick={onClose}
        className="min-h-11 rounded-full bg-primary px-6 text-[15px] font-semibold text-white active:opacity-80"
      >
        {t('actions.close', 'Close')}
      </button>
    </div>
  );
};

export default SheetErrorFallback;
