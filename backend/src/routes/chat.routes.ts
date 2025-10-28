import express from 'express';
import { ChatController } from '../controllers/chat.controller.js';
import multer from 'multer';

const router = express.Router();
const chatController = new ChatController();

// Configure multer for PDF uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') return cb(null, true);
    cb(new Error('Only PDF files are allowed'));
  },
});

// Chat routes
router.post('/send', chatController.sendMessage.bind(chatController));
router.get('/conversations', chatController.getConversations.bind(chatController));
router.get('/conversations/:id', chatController.getConversation.bind(chatController));
router.post('/conversations', chatController.createConversation.bind(chatController));
router.delete('/conversations/:id', chatController.deleteConversation.bind(chatController));

// Dynamic questions
router.post('/generate-dynamic-questions', chatController.generateDynamicQuestions.bind(chatController));

// PDF OCR via OCR.space
router.post('/parse-pdf', upload.single('pdf'), chatController.parsePdf.bind(chatController));

// Custom system prompt
router.post('/generate-custom-prompt', chatController.generateCustomSystemPrompt.bind(chatController));

// Update user business name
router.put('/users/business-name', chatController.updateUserBusinessName.bind(chatController));

// Update existing system prompt by id
router.put('/system-prompts/:id', chatController.updateSystemPrompt.bind(chatController));

export default router;


