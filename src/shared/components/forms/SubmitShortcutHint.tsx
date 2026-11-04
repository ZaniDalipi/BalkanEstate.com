import React from 'react';
import { useTranslation } from 'react-i18next';
import { isApplePlatform } from '@/src/shared/utils/formEnterKey';

/**
 * "or press Ctrl + Enter" under a form's send button. Shown only with a mouse
 * or trackpad (keyboards are rare on touch screens, where the hint is noise).
 */
const SubmitShortcutHint: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { t } = useTranslation('common');
  const modifier = isApplePlatform() ? '⌘' : 'Ctrl';
  return (
    <p className={`hidden [@media(pointer:fine)]:block text-center text-xs text-neutral-500 ${className}`}>
      {t('formSubmit.shortcutPrefix', { defaultValue: 'or press' })}{' '}
      <kbd className="px-1.5 py-0.5 rounded border border-neutral-300 bg-neutral-50 font-sans text-[11px] text-neutral-700">{modifier}</kbd>
      {' + '}
      <kbd className="px-1.5 py-0.5 rounded border border-neutral-300 bg-neutral-50 font-sans text-[11px] text-neutral-700">Enter</kbd>
    </p>
  );
};

export default SubmitShortcutHint;
