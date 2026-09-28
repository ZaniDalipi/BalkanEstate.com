# Social sharing for new listings

Every listing that goes live on the site lands in **Admin → Social Sharing**.
Nothing is posted until an admin approves it.

| Channel | How it's posted |
|---|---|
| Facebook Page | Automatically when you approve (link post with the listing preview) |
| Instagram | Automatically when you approve (photo carousel, up to 10 photos) |
| Facebook group | By hand: **Copy text & open group**, then paste. Meta removed the Groups API in 2024, so no app is allowed to post into a group |

Listings imported from other portals are not queued. To share an older
listing, paste its ID or link into **Add to queue**.

## Daily use

1. Open **Admin → Social Sharing**. The sidebar badge shows how many listings are waiting.
2. On each card, edit the caption if you like and untick any channel you don't want.
3. Click **Approve & post**, or **Skip** if you don't want to share this listing.
4. In the **Approved** tab, click **Copy text & open group**. Your group opens
   in a new tab with the post text on your clipboard. Paste it and post. Facebook
   shows the listing photo and title from the link.
5. If a channel failed, the card shows the reason from Facebook. Fix it, then click **Retry failed**.

## One-time setup

The queue works with none of this. Without it you approve posts and share
them to the group by hand. Each account you add gets posted to automatically.

All values go in the backend environment (`backend/.env` or your hosting
provider's environment settings). Restart the backend after changing them.

### 1. Facebook group link

Set `FACEBOOK_GROUP_URL` to your group's address, e.g. `https://www.facebook.com/groups/yourgroup`.

### 2. Facebook Page

1. Create a Facebook Page for the business if you don't have one.
   Optionally link it to your group (Group → Settings → Linked Pages) so members find it.
2. Go to <https://developers.facebook.com/apps>, create an app (type **Business**)
   and add the **Facebook Login for Business** product.
3. In the [Graph API Explorer](https://developers.facebook.com/tools/explorer/),
   select your app, request `pages_manage_posts`, `pages_read_engagement`,
   `pages_show_list` (plus `instagram_basic` and `instagram_content_publish` for
   step 3), and generate a **User** token.
4. Exchange it for a long-lived token with the Access Token Debugger ("Extend Access Token").
5. Call `GET /me/accounts` with the long-lived user token. The `access_token` next
   to your Page is a **Page token that does not expire**. Put it in
   `FACEBOOK_PAGE_ACCESS_TOKEN` and the Page's `id` in `FACEBOOK_PAGE_ID`.

While the app is in Development mode it can post only to Pages you administer,
which is all this needs. Meta App Review is only required if Meta asks for it
when you switch the app to Live.

### 3. Instagram

1. Switch the Instagram account to a **Business** or **Creator** account
   (Instagram app → Settings → Account type).
2. Connect it to the Facebook Page (Page → Settings → Linked accounts → Instagram).
3. Call `GET /{page-id}?fields=instagram_business_account` with the Page token.
   Put the returned `id` in `INSTAGRAM_BUSINESS_ACCOUNT_ID`.

Instagram notes:

- Links in captions aren't clickable. Consider mentioning "link in bio".
- Photos are cropped to square JPEGs automatically when they're stored on Cloudinary.
- Instagram allows about 100 API posts per account per 24 hours.

### Checking it works

The top of the Social Sharing screen shows ✓ for each connected account.
Approve one listing with only Facebook Page ticked and confirm it appears on the Page.

## TikTok

Not connected yet. TikTok's Content Posting API only allows public posts after
TikTok audits the app. Until then, API posts can only be private.

## For developers

- Queue entry: `backend/src/models/SocialPost.ts`, one per property, created by
  `queueListingForSocial` when a listing becomes active (create or update).
- Caption: `backend/src/services/social/socialCaption.ts`
- Graph API calls: `backend/src/services/social/socialPublisher.ts`
- Admin API: `/api/admin/social-posts` (`socialPostRoutes.ts`)
- Admin UI: `src/features/admin/components/SocialShareQueue.tsx`
