import { useCallback } from 'react';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';

/** URL slug of the "Imported drafts" account tab. */
export const IMPORT_REVIEW_TAB_SLUG = 'import-review';

/** Navigate to the imported-drafts review tab from anywhere in the app. */
export const useOpenImportReview = () =>
  useCallback(() => navigate(paths.account(IMPORT_REVIEW_TAB_SLUG)), []);
