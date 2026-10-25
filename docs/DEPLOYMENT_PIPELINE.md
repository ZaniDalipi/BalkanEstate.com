# Deployment pipeline

Every push to `main` runs the **Deploy** workflow (`.github/workflows/deploy.yml`):

```
CI (lint, type check, builds)  →  Staging  →  your approval  →  Production
```

| Step | What happens | Where |
|------|--------------|-------|
| CI | `ci.yml` runs as the first job. If it fails, nothing is deployed. | GitHub Actions |
| Staging | Frontend is built with the `staging` environment's secrets and published to the Cloudflare Pages `staging` branch, then smoke-tested. | https://staging.balkanestateai.pages.dev |
| Approval | The run pauses on the `production` environment until a reviewer approves it. | Actions run page → "Review deployments" |
| Production | Same build with `production` secrets, published to the Pages `main` branch and smoke-tested. | https://balkanestateai.com |

Pull requests into `main` run CI only. "Run workflow" on the Deploy workflow
redeploys a branch through the same steps.

## One-time setup

1. **Cloudflare API token.** Cloudflare → My Profile → API Tokens → create a token
   with *Account → Cloudflare Pages → Edit*. Put it in GitHub → Settings →
   Secrets and variables → Actions as `CLOUDFLARE_API_TOKEN`, and the account id
   as `CLOUDFLARE_ACCOUNT_ID`.
2. **Environments.** GitHub → Settings → Environments: create `staging` and
   `production` (the first Deploy run creates them if missing).
3. **Approval gate.** On `production`, tick *Required reviewers* and add yourself.
   Without it, production deploys right after staging passes.
   (Private repos need a paid GitHub plan for required reviewers.)
4. **Staging backend (recommended).** Staging uses the repository-level secrets
   unless the `staging` environment overrides them, so out of the box it talks
   to the production API and database. To isolate it, create a second Railway
   service with its own MongoDB database, then add `VITE_API_URL` (and any other
   values that differ) as secrets on the `staging` environment. Add the staging
   site's origin (`https://staging.balkanestateai.pages.dev`) to the staging
   backend's `ALLOWED_ORIGINS`.
5. **Pages Functions variables.** In Cloudflare → Workers & Pages →
   balkanestateai → Settings → Variables and Secrets, set `MEDIA_CDN_URL` for
   both Production and Preview (staging is a Preview branch).

## Notes

- The backend deploys separately: Railway redeploys on push to `main`, so it
  does not wait for the approval step.
- Cloudflare marks non-production branches (`*.pages.dev` previews, including
  staging) `noindex`, so staging doesn't compete with the live site in search.
