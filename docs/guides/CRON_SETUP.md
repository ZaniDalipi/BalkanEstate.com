# Sold Properties Are Kept

Sold listings used to be deleted 24 hours after they sold by a cron job
running `npm run cleanup:sold`. They are now kept for good: buyers can filter
search to sold homes and every property page shows what nearby homes sold for
(`GET /api/properties/:id/area-prices`).

The script and the `cleanup:sold` npm command have been removed. **If a server
still has the cron entry, delete it** (look for `cleanup:sold` in `crontab -l`
or in your PM2 / scheduler config).

Default search still shows only available homes, plus anything sold in the
last 24 hours with a "Sold" badge. Photos of sold listings are cleared after
`MEDIA_RETENTION_SOLD_YEARS` (default 2) by the media retention job; the
listing and its price stay.
