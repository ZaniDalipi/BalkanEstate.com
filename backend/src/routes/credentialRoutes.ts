import express from 'express';
import multer from 'multer';
import {
  getCredentials,
  addCredential,
  updateCredential,
  deleteCredential,
  getAgentPublicCredentials,
} from '../controllers/credentialController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Configure multer for credential document uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images and PDFs
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only image and PDF files are allowed'));
    }
  },
});

// Public routes
router.get('/agent/:agentId', getAgentPublicCredentials);

// Protected routes (require authentication)
router.get('/', protect, getCredentials);
router.post('/', protect, upload.single('document'), addCredential);
router.put('/:credentialId', protect, upload.single('document'), updateCredential);
router.delete('/:credentialId', protect, deleteCredential);

export default router;
