import express from 'express';
import multer from 'multer';
import {
  uploadLicense,
  getLicense,
  deleteLicense,
} from '../controllers/licenseController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Configure multer for license document uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for documents
  },
  fileFilter: (req, file, cb) => {
    // Accept images and PDFs
    if (
      file.mimetype.startsWith('image/') ||
      file.mimetype === 'application/pdf'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDF files are allowed'));
    }
  },
});

// License routes - Optional upload, no verification needed
router.post('/upload', protect, upload.single('document'), uploadLicense);
router.get('/', protect, getLicense);
router.delete('/', protect, deleteLicense);

export default router;
