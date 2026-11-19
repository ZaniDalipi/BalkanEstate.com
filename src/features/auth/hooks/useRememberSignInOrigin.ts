import { useEffect } from 'react';
import { rememberSignInOrigin } from '@/src/shared/auth/authReturn';

/**
 * Mounted with the sign-in window: remembers the page it opened over, so
 * signing in (email, sign-up, Google/Apple) comes back there instead of to the
 * search page. Runs once per opening, since the window mounts only while open.
 */
export function useRememberSignInOrigin(): void {
  useEffect(() => {
    rememberSignInOrigin();
  }, []);
}
