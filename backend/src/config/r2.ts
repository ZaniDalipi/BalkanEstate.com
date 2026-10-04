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
 * While these are unset the app keeps uploading to Cloudinary, so the switch
 * is a config change, not a deploy.
 */

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBucket: string;
  privateBucket: string;
  /** e.g. https://media.balkanestateai.com — no trailing slash. */
  publicUrl: string;
}

export const readR2Config = (env: NodeJS.ProcessEnv = process.env): R2Config | null => {
  const accountId = env.R2_ACCOUNT_ID;
  const accessKeyId = env.R2_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
  const publicBucket = env.R2_BUCKET;
  const publicUrl = env.R2_PUBLIC_URL;
  if (!accountId || !accessKeyId || !secretAccessKey || !publicBucket || !publicUrl) return null;
  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    publicBucket,
    // Falls back to the public bucket name + suffix so a single env change can't
    // ever put a document in the public bucket.
    privateBucket: env.R2_PRIVATE_BUCKET || `${publicBucket}-private`,
    publicUrl: publicUrl.replace(/\/+$/, ''),
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
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    });
  }
  return cachedClient;
};

/** True while Cloudinary credentials are still set (legacy assets, migration). */
export const isCloudinaryConfigured = (): boolean =>
  Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

/** Test hook: forget cached settings after changing process.env. */
export const resetR2ConfigForTests = (): void => {
  cachedConfig = undefined;
  cachedClient = undefined;
};
