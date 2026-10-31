import { S3Client } from '@aws-sdk/client-s3';

/**
 * Cloudflare R2 — where every photo is stored.
 *
 * R2 speaks the S3 API, so the AWS SDK talks to it with an R2 endpoint.
 * Two buckets:
 *  - R2_BUCKET          public, served through R2_PUBLIC_URL (a custom domain
 *                       on Cloudflare's CDN). Listing photos, avatars, logos…
 *  - R2_PRIVATE_BUCKET  never public. Licences and credentials, read only
 *                       through short-lived presigned URLs.
 *
 * Without them uploads are refused (production refuses to start).
 */

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBucket: string;
  privateBucket: string;
  /** e.g. https://media.balkanestateai.com — no trailing slash. */
  publicUrl: string;
  /**
   * S3 API endpoint. Default https://{account}.r2.cloudflarestorage.com;
   * R2_ENDPOINT overrides it (EU-jurisdiction buckets:
   * https://{account}.eu.r2.cloudflarestorage.com, or a local S3 for tests).
   */
  endpoint: string;
}

export const readR2Config = (env: NodeJS.ProcessEnv = process.env): R2Config | null => {
  const accountId = env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY?.trim();
  const publicBucket = env.R2_BUCKET?.trim();
  const publicUrl = env.R2_PUBLIC_URL?.trim();
  if (!accountId || !accessKeyId || !secretAccessKey || !publicBucket || !publicUrl) return null;
  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    publicBucket,
    // Falls back to the public bucket name + suffix so a single env change can't
    // ever put a document in the public bucket.
    privateBucket: env.R2_PRIVATE_BUCKET?.trim() || `${publicBucket}-private`,
    publicUrl: publicUrl.replace(/\/+$/, ''),
    endpoint: env.R2_ENDPOINT?.trim().replace(/\/+$/, '') || `https://${accountId}.r2.cloudflarestorage.com`,
  };
};

let cachedConfig: R2Config | null | undefined;
let cachedClient: S3Client | undefined;

/** The R2 settings, or null while R2 isn't configured. */
export const getR2Config = (): R2Config | null => {
  if (cachedConfig === undefined) cachedConfig = readR2Config();
  return cachedConfig;
};

/** True when new uploads go to R2. */
export const isR2Enabled = (): boolean => getR2Config() !== null;

/** Public origin of the media bucket, or null while R2 isn't configured. */
export const getMediaPublicUrl = (): string | null => getR2Config()?.publicUrl ?? null;

export const getR2Client = (): S3Client => {
  const config = getR2Config();
  if (!config) throw new Error('R2 is not configured (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL)');
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: 'auto',
      endpoint: config.endpoint,
      // Bucket in the path, not the host name: R2 accepts both, and it works
      // with any endpoint (no DNS per bucket).
      forcePathStyle: true,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    });
  }
  return cachedClient;
};

/** Test hook: forget cached settings after changing process.env. */
export const resetR2ConfigForTests = (): void => {
  cachedConfig = undefined;
  cachedClient = undefined;
};

const R2_REQUIRED_VARS = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_PUBLIC_URL'] as const;

/** Which R2 variables are missing or empty. */
export const missingR2Vars = (env: NodeJS.ProcessEnv = process.env): string[] =>
  R2_REQUIRED_VARS.filter((name) => !env[name]?.trim());

/** One line for the startup log: where uploads go, or why nowhere. */
export const describeMediaStorage = (): string => {
  const config = getR2Config();
  if (config) return `R2 (bucket ${config.publicBucket}, served from ${config.publicUrl})`;
  return `NONE — uploads will fail. Set ${missingR2Vars().join(', ')} in backend/.env`;
};
