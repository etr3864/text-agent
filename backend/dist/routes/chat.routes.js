"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const chat_controller_js_1 = require("../controllers/chat.controller.js");
const multer_1 = __importDefault(require("multer"));
const router = express_1.default.Router();
const chatController = new chat_controller_js_1.ChatController();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf')
            return cb(null, true);
        cb(new Error('Only PDF files are allowed'));
    },
});
router.post('/send', chatController.sendMessage.bind(chatController));
router.get('/conversations', chatController.getConversations.bind(chatController));
router.get('/conversations/:id', chatController.getConversation.bind(chatController));
router.post('/conversations', chatController.createConversation.bind(chatController));
router.delete('/conversations/:id', chatController.deleteConversation.bind(chatController));
router.post('/generate-dynamic-questions', chatController.generateDynamicQuestions.bind(chatController));
router.post('/parse-pdf', upload.single('pdf'), chatController.parsePdf.bind(chatController));
router.post('/generate-custom-prompt', chatController.generateCustomSystemPrompt.bind(chatController));
router.put('/users/business-name', chatController.updateUserBusinessName.bind(chatController));
router.put('/system-prompts/:id', chatController.updateSystemPrompt.bind(chatController));
exports.default = router;
//# sourceMappingURL=chat.routes.js.map