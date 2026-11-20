import { signedInLandingPage, signInDestination, takeReturnPath } from '@/src/shared/auth/authReturn';
import { readLastPage } from './lastPage';
import { navigate } from './navigation';
import { paths } from './paths';

/**
 * Once signed in, go back to the page the user signed in from (see
 * authReturn). Already there — an email sign-in over the page — it stays put,
 * keeping whatever was open on it. Signed in from `/login`, it goes to the last
 * page the user had open, else home.
 */
export function returnAfterSignIn(): void {
  const current = `${window.location.pathname}${window.location.search}`;
  const fallback = signedInLandingPage(readLastPage(), paths.home());
  const target = signInDestination(takeReturnPath(), current, fallback);
  if (target) navigate(target, { replace: true });
}
