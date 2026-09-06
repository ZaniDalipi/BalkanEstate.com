/**
 * Shared upload limits.
 *
 * These must stay in sync with the frontend (FILE_LIMITS in
 * src/shared/constants/app.constants.ts). When multer's per-field maxCount is
 * lower than what the UI allows, multer aborts the request with
 * LIMIT_UNEXPECTED_FILE ("Unexpected field"), which is confusing to debug —
 * keep the numbers here as the single backend source of truth.
 */

/** Maximum number of images accepted per property upload request. */
export const MAX_PROPERTY_IMAGES = 30;

/** Maximum size of a single uploaded property image (5 MB). */
export const MAX_PROPERTY_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

/** Maximum number of images accepted by the AI description/analysis endpoint. */
export const MAX_AI_ANALYSIS_IMAGES = MAX_PROPERTY_IMAGES;

/** Maximum size of a single image sent to the AI analysis endpoint (10 MB). */
export const MAX_AI_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
