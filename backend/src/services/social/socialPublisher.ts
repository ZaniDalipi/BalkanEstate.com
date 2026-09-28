import axios, { AxiosError } from 'axios';

/**
 * Publishing to the site's own Facebook Page and Instagram account through the
 * Meta Graph API.
 *
 * Facebook *groups* are deliberately absent: Meta removed the Groups API in
 * 2024, so nothing may post into a group programmatically. The admin queue
 * copies the caption for a manual group post instead.
 *
 * Configuration (all optional — a channel with missing settings is simply
 * reported as not configured):
 *   FACEBOOK_PAGE_ID                Numeric ID of the Facebook Page
 *   FACEBOOK_PAGE_ACCESS_TOKEN      Long-lived Page token with pages_manage_posts
 *   INSTAGRAM_BUSINESS_ACCOUNT_ID   IG Business/Creator account linked to that Page
 *                                   (uses the same Page token; needs instagram_content_publish)
 *   META_GRAPH_API_VERSION          Defaults to v21.0
 *   FACEBOOK_GROUP_URL              The group the admin shares into by hand
 */

export interface SocialConfig {
  facebookPage: boolean;
  instagram: boolean;
  facebookGroupUrl: string | null;
}

export interface PublishResult {
  postId: string;
  postUrl?: string;
}

const MAX_CAROUSEL_ITEMS = 10;
const CONTAINER_POLL_ATTEMPTS = 10;
const CONTAINER_POLL_MS = 3000;

const graphBase = () => `https://graph.facebook.com/${process.env.META_GRAPH_API_VERSION || 'v21.0'}`;
const pageToken = () => process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '';

export const getSocialConfig = (): SocialConfig => {
  const hasToken = Boolean(pageToken());
  return {
    facebookPage: hasToken && Boolean(process.env.FACEBOOK_PAGE_ID),
    instagram: hasToken && Boolean(process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID),
    facebookGroupUrl: process.env.FACEBOOK_GROUP_URL || null,
  };
};

/** Graph API errors carry the useful text in error.message; surface that, never the token. */
export const describeGraphError = (err: unknown): string => {
  const axiosErr = err as AxiosError<{ error?: { message?: string } }>;
  const graphMessage = axiosErr?.response?.data?.error?.message;
  if (graphMessage) return graphMessage;
  return err instanceof Error ? err.message : 'Unknown error';
};

const graphPost = async <T>(path: string, params: Record<string, string>): Promise<T> => {
  const body = new URLSearchParams({ ...params, access_token: pageToken() });
  const { data } = await axios.post<T>(`${graphBase()}/${path}`, body, { timeout: 30000 });
  return data;
};

const graphGet = async <T>(path: string, fields: string): Promise<T> => {
  const { data } = await axios.get<T>(`${graphBase()}/${path}`, {
    params: { fields, access_token: pageToken() },
    timeout: 30000,
  });
  return data;
};

/**
 * Instagram fetches the image itself and only accepts JPEGs with an aspect
 * ratio between 4:5 and 1.91:1. Cloudinary can serve a square JPEG of any
 * upload; other hosts are passed through as they are.
 */
export const instagramImageUrl = (url: string): string =>
  url.includes('res.cloudinary.com') && url.includes('/upload/')
    ? url.replace('/upload/', '/upload/c_fill,g_auto,w_1080,h_1080,f_jpg,q_auto/')
    : url;

export const publishToFacebookPage = async (caption: string, link: string): Promise<PublishResult> => {
  const { id } = await graphPost<{ id: string }>(`${process.env.FACEBOOK_PAGE_ID}/feed`, {
    message: caption,
    link,
  });
  return { postId: id, postUrl: `https://www.facebook.com/${id}` };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForContainer = async (containerId: string): Promise<void> => {
  for (let attempt = 0; attempt < CONTAINER_POLL_ATTEMPTS; attempt++) {
    const { status_code } = await graphGet<{ status_code?: string }>(containerId, 'status_code');
    if (status_code === 'FINISHED') return;
    if (status_code === 'ERROR' || status_code === 'EXPIRED') {
      throw new Error(`Instagram could not process the images (${status_code})`);
    }
    await sleep(CONTAINER_POLL_MS);
  }
  throw new Error('Instagram is still processing the images; try again in a minute');
};

export const publishToInstagram = async (caption: string, imageUrls: string[]): Promise<PublishResult> => {
  const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID as string;
  const images = imageUrls.slice(0, MAX_CAROUSEL_ITEMS).map(instagramImageUrl);
  if (images.length === 0) throw new Error('Instagram posts need at least one photo');

  let containerId: string;
  if (images.length === 1) {
    ({ id: containerId } = await graphPost<{ id: string }>(`${accountId}/media`, {
      image_url: images[0],
      caption,
    }));
  } else {
    const children: string[] = [];
    for (const image_url of images) {
      const { id } = await graphPost<{ id: string }>(`${accountId}/media`, {
        image_url,
        is_carousel_item: 'true',
      });
      children.push(id);
    }
    ({ id: containerId } = await graphPost<{ id: string }>(`${accountId}/media`, {
      media_type: 'CAROUSEL',
      children: children.join(','),
      caption,
    }));
  }

  await waitForContainer(containerId);
  const { id: mediaId } = await graphPost<{ id: string }>(`${accountId}/media_publish`, {
    creation_id: containerId,
  });

  // The permalink is a nicety for the admin card; a failed lookup doesn't undo the post.
  const permalink = await graphGet<{ permalink?: string }>(mediaId, 'permalink')
    .then((d) => d.permalink)
    .catch(() => undefined);
  return { postId: mediaId, postUrl: permalink };
};
