import { signInDestination, takeReturnPath } from '@/src/shared/auth/authReturn';
import { navigate } from './navigation';
import { paths } from './paths';

/**
 * Once signed in, go back to the page the user signed in from (see
 * authReturn). Already there — an email sign-in over the page — it stays put,
 * keeping whatever was open on it.
 */
export function returnAfterSignIn(): void {
  const current = `${window.location.pathname}${window.location.search}`;
  const target = signInDestination(takeReturnPath(), current, paths.search());
  if (target) navigate(target, { replace: true });
}
