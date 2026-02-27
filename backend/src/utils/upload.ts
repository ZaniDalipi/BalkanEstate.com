import multer from 'multer';
import path from 'path';

// Allowed image extensions (whitelist)
// SVG removed: SVGs can contain embedded JavaScript causing stored XSS
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff']);

// Allowed MIME types (whitelist)
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/tiff',
]);

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter - validates both MIME type and file extension
const fileFilter = (_req: any, file: Express.Multer.File, cb: any) => {
  const ext = path.extname(file.originalname).toLowerCase();

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(new Error('Not an image! Please upload only images (JPEG, PNG, GIF, WebP, SVG).'), false);
    return;
  }

  // Check file extension (prevents MIME type spoofing)
  if (ext && !ALLOWED_EXTENSIONS.has(ext)) {
    cb(new Error('Invalid file extension. Allowed: jpg, jpeg, png, gif, webp, svg, bmp, tiff.'), false);
    return;
  }

  cb(null, true);
};

// Create multer upload instance
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
});
