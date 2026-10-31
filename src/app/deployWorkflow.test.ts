import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

/**
 * `wrangler pages deploy dist` ships the Pages Functions (the link previews for
 * blog posts, listings, agents and residences) only when ./functions exists
 * next to where it runs. A deploy job that downloads dist/ but never checks the
 * repo out publishes a static-only site, and every shared link then shows the
 * generic card.
 */
describe('Cloudflare Pages deploy workflow', () => {
  const workflow = readFileSync(resolve(__dirname, '../../.github/workflows/deploy.yml'), 'utf8');
  const jobs = workflow.split(/\n  (?=[a-z][\w-]*:\n    name:)/).filter((job) => job.includes('wrangler-action'));

  it('has the Pages deploy jobs', () => {
    expect(jobs.length).toBeGreaterThanOrEqual(2);
  });

  it.each(jobs.map((job) => [job.split('\n')[0].replace(':', ''), job] as const))('%s checks the repo out before deploying', (_name, job) => {
    const checkout = job.indexOf('actions/checkout');
    const deploy = job.indexOf('wrangler-action');
    expect(checkout).toBeGreaterThan(-1);
    expect(checkout).toBeLessThan(deploy);
  });

  it('the functions folder it relies on exists', () => {
    expect(readFileSync(resolve(__dirname, '../../functions/_og-residence.ts'), 'utf8')).toContain('handleResidenceOgRequest');
  });
});
