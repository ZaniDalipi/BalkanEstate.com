/**
 * Checks where every package in a package-lock.json comes from.
 *
 * `npm ci` installs exactly what the lockfile says, including the URL each
 * tarball is downloaded from. A pull request can quietly point one entry at
 * another server (or plain http, or drop its integrity hash) and the install
 * would fetch it without complaint. This refuses any entry that is not an
 * https download from the public npm registry with an integrity hash.
 *
 * Used by scripts/check-lockfiles.mjs in CI.
 */

export const ALLOWED_REGISTRY = 'https://registry.npmjs.org/';

/**
 * @param {{ packages?: Record<string, { resolved?: string, integrity?: string, link?: boolean }> }} lock
 * @returns {{ name: string, reason: string }[]} one entry per package that breaks the rules
 */
export function findUntrustedSources(lock) {
  const problems = [];
  for (const [path, entry] of Object.entries(lock.packages ?? {})) {
    // "" is the project itself; links point at folders inside the repo.
    if (path === '' || entry.link) continue;
    const name = path.replace(/^.*node_modules\//, '');
    if (!entry.resolved) {
      problems.push({ name, reason: 'no download URL (resolved) in the lockfile' });
    } else if (!entry.resolved.startsWith(ALLOWED_REGISTRY)) {
      problems.push({ name, reason: `downloads from ${entry.resolved}, not ${ALLOWED_REGISTRY}` });
    } else if (!entry.integrity) {
      problems.push({ name, reason: 'no integrity hash, so a swapped tarball would not be noticed' });
    }
  }
  return problems;
}
