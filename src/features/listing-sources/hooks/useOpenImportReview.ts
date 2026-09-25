import { useCallback } from 'react';
import { useAppContext } from '@/context/AppContext';
import { buildLocalizedPath } from '@/src/utils/languageRouting';

/** URL slug of the "Imported drafts" account tab. */
export const IMPORT_REVIEW_TAB_SLUG = 'import-review';

/** Navigate to the imported-drafts review tab from anywhere in the app. */
export const useOpenImportReview = () => {
  const { dispatch } = useAppContext();
  return useCallback(() => {
    window.history.pushState({}, '', buildLocalizedPath(`/account/${IMPORT_REVIEW_TAB_SLUG}`));
    dispatch({ type: 'SET_ACCOUNT_TAB', payload: 'importReview' });
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'account' });
  }, [dispatch]);
};
