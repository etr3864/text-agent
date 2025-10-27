"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatController = void 0;
const conversation_service_js_1 = require("../services/conversation.service.js");
const ai_service_js_1 = require("../services/ai.service.js");
const supabase_service_js_1 = require("../services/supabase.service.js");
const env_js_1 = require("../config/env.js");
const axios_1 = __importDefault(require("axios"));
class ChatController {
    constructor() {
        this.conversationService = new conversation_service_js_1.ConversationService();
    }
    async sendMessage(req, res) {
        try {
            const { message, conversationId, systemPrompt } = req.body;
            if (!message || typeof message !== 'string') {
                res.status(400).json({
                    success: false,
                    error: 'Message is required and must be a string'
                });
                return;
            }
            const response = await this.conversationService.sendMessage({
                message,
                conversationId,
                systemPrompt
            });
            if (response.success) {
                res.json(response);
            }
            else {
                res.status(500).json(response);
            }
        }
        catch (error) {
            console.error('Error in sendMessage:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
    async getConversations(req, res) {
        try {
            const conversations = await this.conversationService.getAllConversations();
            res.json({
                success: true,
                conversations
            });
        }
        catch (error) {
            console.error('Error getting conversations:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
    async getConversation(req, res) {
        try {
            const { id } = req.params;
            const conversation = await this.conversationService.getConversation(id);
            if (!conversation) {
                res.status(404).json({
                    success: false,
                    error: 'Conversation not found'
                });
                return;
            }
            res.json({
                success: true,
                conversation
            });
        }
        catch (error) {
            console.error('Error getting conversation:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
    async createConversation(req, res) {
        try {
            const { title } = req.body;
            const conversation = await this.conversationService.createConversation(title);
            res.json({
                success: true,
                conversation
            });
        }
        catch (error) {
            console.error('Error creating conversation:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
    async deleteConversation(req, res) {
        try {
            const { id } = req.params;
            const deleted = await this.conversationService.deleteConversation(id);
            if (!deleted) {
                res.status(404).json({
                    success: false,
                    error: 'Conversation not found'
                });
                return;
            }
            res.json({
                success: true,
                message: 'Conversation deleted successfully'
            });
        }
        catch (error) {
            console.error('Error deleting conversation:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
    async generateDynamicQuestions(req, res) {
        try {
            const { businessName, businessField, businessGoal } = req.body;
            if (!businessName || !businessField || !businessGoal) {
                res.status(400).json({
                    success: false,
                    error: 'Missing required fields'
                });
                return;
            }
            const systemPrompt = `אתה מומחה ליצירת שאלות מותאמות עבור עסקים.
על בסיס הפרטים הבאים, צור 5-8 שאלות המותאמות לעסק:

שם העסק: ${businessName}
תחום עיסוק: ${businessField}
מטרת הסוכן: ${businessGoal}

צור שאלות שתעזורנה להבין איך הסוכן צריך לדבר עם הלקוחות, מה הם המאפיינים החשובים של העסק, ומה הלקוחות מחפשים.
השאלות צריכות להיות פתוחות ואיכותיות.
תחזיר רק את השאלות, אחת בכל שורה, בלי מספור.`;
            const questions = await ai_service_js_1.aiService.generateDynamicQuestions(systemPrompt);
            res.json({
                success: true,
                questions
            });
        }
        catch (error) {
            console.error('Error generating dynamic questions:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to generate questions'
            });
        }
    }
    async parsePdf(req, res) {
        try {
            if (!req.file) {
                res.status(400).json({
                    success: false,
                    error: 'No PDF file provided'
                });
                return;
            }
            const fileBuffer = req.file.buffer;
            const base64File = fileBuffer.toString('base64');
            const formData = new FormData();
            formData.append('file', fileBuffer);
            formData.append('language', 'heb');
            formData.append('apikey', env_js_1.config.ocr.apiKey);
            formData.append('OCREngine', '1');
            const response = await axios_1.default.post('https://api.ocr.space/parse/file', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            const extractedText = response.data.ParsedResults?.[0]?.ParsedText || '';
            res.json({
                success: true,
                text: extractedText
            });
        }
        catch (error) {
            console.error('Error parsing PDF:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to parse PDF'
            });
        }
    }
    async generateCustomSystemPrompt(req, res) {
        try {
            const { answers, userPhone } = req.body;
            if (!answers || !Array.isArray(answers) || answers.length === 0) {
                res.status(400).json({
                    success: false,
                    error: 'Answers are required'
                });
                return;
            }
            const combinedAnswers = answers.join('\n\n');
            const systemPrompt = await ai_service_js_1.aiService.generateCustomSystemPrompt(combinedAnswers);
            const savedPrompt = await supabase_service_js_1.supabaseService.createCustomSystemPrompt(systemPrompt, userPhone);
            if (userPhone && savedPrompt) {
                const user = await supabase_service_js_1.supabaseService.getUserByPhone(userPhone);
                if (user) {
                    await supabase_service_js_1.supabaseService.updateUserSystemPrompt(user.id, savedPrompt.id);
                }
            }
            res.json({
                success: true,
                systemPrompt: savedPrompt
            });
        }
        catch (error) {
            console.error('Error generating custom system prompt:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to generate system prompt'
            });
        }
    }
    async updateUserBusinessName(req, res) {
        try {
            const { phone, businessName } = req.body;
            if (!phone || !businessName) {
                res.status(400).json({
                    success: false,
                    error: 'Phone and business name are required'
                });
                return;
            }
            const updated = await supabase_service_js_1.supabaseService.updateUserBusinessName(phone, businessName);
            if (updated) {
                res.json({
                    success: true,
                    message: 'Business name updated successfully'
                });
            }
            else {
                res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }
        }
        catch (error) {
            console.error('Error updating business name:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update business name'
            });
        }
    }
}
exports.ChatController = ChatController;
//# sourceMappingURL=chat.controller.js.map