import express from 'express';
import { ChatController } from '../controllers/chat.controller.js';

const router = express.Router();
const chatController = new ChatController();

// Chat routes
router.post('/send', chatController.sendMessage.bind(chatController));
router.get('/conversations', chatController.getConversations.bind(chatController));
router.get('/conversations/:id', chatController.getConversation.bind(chatController));
router.post('/conversations', chatController.createConversation.bind(chatController));
router.delete('/conversations/:id', chatController.deleteConversation.bind(chatController));

export default router;


