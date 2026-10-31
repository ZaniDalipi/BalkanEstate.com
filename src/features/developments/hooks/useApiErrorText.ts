import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { readApiError, statusTextKey, type ApiErrorInfo } from '../utils/apiError';
import { API_ERROR_TEXT, API_STATUS_TEXT, CONFLICT_TEXT } from '../utils/apiErrorText';
import type { AttachmentConflict } from '../types';

export interface DescribedApiError {
  text: string;
  field?: string;
  code?: string;
  status?: number;
}

/**
 * A server refusal in the reader's language: by its code when we know it,
 * otherwise by its HTTP status. Never the server's English message.
 * `field` says which form field the text belongs next to, if any.
 */
export function useApiErrorText() {
  const { t } = useTranslation('developments');

  const textFor = useCallback(
    (info: ApiErrorInfo): string => {
      if (info.code && API_ERROR_TEXT[info.code]) {
        return t(`developments:apiErrors.${info.code}`, { ...info.params, defaultValue: API_ERROR_TEXT[info.code] });
      }
      const key = statusTextKey(info.status, info.network);
      return t(`developments:apiErrors.status.${key}`, { defaultValue: API_STATUS_TEXT[key] });
    },
    [t]
  );

  return useMemo(() => {
    const describe = (err: unknown): DescribedApiError => {
      const info = readApiError(err);
      return { text: textFor(info), field: info.field, code: info.code, status: info.status };
    };
    const conflict = (c: Pick<AttachmentConflict, 'code'>): string =>
      CONFLICT_TEXT[c.code] ? t(`developments:apiErrors.conflict.${c.code}`, { defaultValue: CONFLICT_TEXT[c.code] }) : t('developments:apiErrors.status.conflict', { defaultValue: API_STATUS_TEXT.conflict });
    /** A code that came inside a result (e.g. one import row), not as a thrown error. */
    const forCode = (code: string | undefined, params: Record<string, string | number> = {}): string => textFor({ code, params, status: 400 });
    return { describe, text: (err: unknown) => describe(err).text, conflict, forCode };
  }, [t, textFor]);
}
