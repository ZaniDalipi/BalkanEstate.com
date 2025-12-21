import express from 'express';
import {
  getConversations,
  getConversation,
  createConversation,
  deleteConversation,
  sendMessage,
  markAsRead,
  uploadMessageImage,
  getSecurityWarning,
  getConversationPublicKeys,
} from '../controllers/conversationController';
import { protect } from '../middleware/auth';
import { upload } from '../utils/upload';

const router = express.Router();

// Public route for security warning
router.get('/security-warning', getSecurityWarning);

router.use(protect); // All other routes are protected

router.get('/', getConversations);
router.post('/', createConversation);
router.get('/:id', getConversation);
router.delete('/:id', deleteConversation);
router.get('/:id/public-keys', getConversationPublicKeys);
router.post('/:id/messages', sendMessage);
router.post('/:id/upload-image', upload.single('image'), uploadMessageImage);
router.patch('/:id/read', markAsRead);

export default router;
