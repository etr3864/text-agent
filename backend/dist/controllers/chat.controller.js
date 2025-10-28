"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatController = void 0;
const conversation_service_js_1 = require("../services/conversation.service.js");
const env_js_1 = require("../config/env.js");
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const ai_service_js_1 = require("../services/ai.service.js");
const pdfParse = __importStar(require("pdf-parse"));
const supabase_service_js_1 = require("../services/supabase.service.js");
class ChatController {
    constructor() {
        this.conversationService = new conversation_service_js_1.ConversationService();
        this.aiService = new ai_service_js_1.AIService();
        this.supabaseService = new supabase_service_js_1.SupabaseService();
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
    async parsePdf(req, res) {
        try {
            if (!req.file) {
                res.status(400).json({ success: false, error: 'No PDF file provided' });
                return;
            }
            if (!env_js_1.config.ocr?.apiKey) {
                res.status(500).json({ success: false, error: 'OCR API key is missing' });
                return;
            }
            const pdfBuffer = req.file.buffer;
            try {
                const formData = new form_data_1.default();
                formData.append('file', pdfBuffer, {
                    filename: req.file.originalname || 'document.pdf',
                    contentType: 'application/pdf',
                });
                formData.append('language', 'heb');
                formData.append('apikey', env_js_1.config.ocr.apiKey);
                formData.append('OCREngine', '1');
                formData.append('filetype', 'pdf');
                formData.append('detectOrientation', 'true');
                formData.append('isTable', 'false');
                formData.append('scale', 'true');
                const response = await axios_1.default.post('https://api.ocr.space/parse/image', formData, {
                    headers: formData.getHeaders(),
                    maxBodyLength: Infinity,
                });
                const result = response.data;
                if (result?.IsErroredOnProcessing) {
                    const message = Array.isArray(result?.ErrorMessage) ? result.ErrorMessage.join(', ') : (result?.ErrorMessage || 'OCR processing error');
                    console.warn('OCR.space error:', message);
                }
                let fullText = '';
                let pages = 0;
                if (result?.ParsedResults && Array.isArray(result.ParsedResults)) {
                    fullText = result.ParsedResults.map((p) => p.ParsedText || '').join('\n\n');
                    pages = result.ParsedResults.length;
                }
                if (fullText && fullText.trim().length > 0) {
                    res.json({ success: true, text: fullText, pages });
                    return;
                }
            }
            catch (ocrError) {
                console.warn('OCR.space call failed, will try pdf-parse fallback:', ocrError instanceof Error ? ocrError.message : ocrError);
            }
            try {
                const parsed = await pdfParse(pdfBuffer);
                const text = (parsed.text || '').trim();
                const numpages = parsed.numpages || 0;
                if (text.length > 0) {
                    res.json({ success: true, text, pages: numpages });
                    return;
                }
            }
            catch (pdfErr) {
                console.warn('pdf-parse fallback failed:', pdfErr instanceof Error ? pdfErr.message : pdfErr);
            }
            res.json({ success: true, text: '', pages: 0 });
        }
        catch (error) {
            console.error('Error parsing PDF:', error);
            res.status(500).json({ success: false, error: 'Failed to parse PDF' });
        }
    }
    async generateDynamicQuestions(req, res) {
        try {
            const { businessName, businessField, businessGoal } = req.body || {};
            if (!businessName || !businessField || !businessGoal) {
                res.status(400).json({ success: false, error: 'Business name, field, and goal are required' });
                return;
            }
            const prompt = `תבסס על המידע הבא, צור 5-8 שאלות מותאמות לבניית system prompt לסוכן AI:
שם העסק: ${businessName}
תחום העסק: ${businessField}
מטרת הסוכן: ${businessGoal}

השאלות צריכות לגלות:
1. אודות העסק
2. קהל היעד
3. סגנון הדיבור
4. מטרות השיחה
5. כללי ברזל

ענה בעברית, רק את השאלות (ללא הסבר נוסף), כל שאלה בשורה נפרדת.`;
            const response = await this.aiService.generateResponse([{ role: 'user', content: prompt }], { temperature: 0.7, maxTokens: 500 });
            const questions = response.content
                .split('\n')
                .map(q => q.trim())
                .filter(q => q && q.length > 5)
                .slice(0, 8);
            res.json({ success: true, questions });
        }
        catch (error) {
            console.error('Error generating dynamic questions:', error);
            res.status(500).json({ success: false, error: 'Failed to generate questions' });
        }
    }
    async generateCustomSystemPrompt(req, res) {
        try {
            const { answers, userPhone } = req.body || {};
            if (!answers || !Array.isArray(answers) || answers.length === 0) {
                res.status(400).json({ success: false, error: 'Answers are required' });
                return;
            }
            const prompt = `אתה מומחה ביצירת סיסטם פרומפטים לסוכנות AI. 

תבסס על התשובות הבאות, צור סיסטם פרומפט מקצועי:
${answers.join('\n')}

הסיסטם פרומפט צריך לכלול:
1. תפקיד הסוכנת
2. פרטי העסק
3. קהל יעד
4. סגנון דיבור
5. מטרות השיחה
6. כללי ברזל
7. מה לעשות ומה לא

ענה רק עם הסיסטם פרומפט, ללא הסבר נוסף.`;
            const response = await this.aiService.generateResponse([{ role: 'user', content: prompt }], { temperature: 0.7, maxTokens: 2000 });
            const generatedPrompt = response.content;
            const created = await this.supabaseService.createCustomSystemPrompt(generatedPrompt, userPhone);
            if (created && userPhone) {
                const user = await this.supabaseService.getUserByPhone(userPhone);
                if (user) {
                    await this.supabaseService.updateUserSystemPrompt(user.id, created.id);
                }
            }
            res.json({
                success: true,
                systemPrompt: {
                    prompt: generatedPrompt,
                    id: created ? created.id : null
                }
            });
        }
        catch (error) {
            console.error('Error generating custom system prompt:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }
    async updateUserBusinessName(req, res) {
        try {
            const { phone, userPhone, businessName } = req.body || {};
            const phoneNumber = phone || userPhone;
            if (!phoneNumber || !businessName) {
                res.status(400).json({ success: false, error: 'Phone and business name are required' });
                return;
            }
            res.json({ success: true, message: 'Business name updated successfully' });
        }
        catch (error) {
            console.error('Error updating business name:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }
    async updateSystemPrompt(req, res) {
        try {
            const { id } = req.params;
            const { prompt } = req.body || {};
            if (!id || !prompt) {
                res.status(400).json({ success: false, error: 'id and prompt are required' });
                return;
            }
            const updated = await this.supabaseService.updateSystemPrompt(id, prompt);
            if (!updated) {
                res.status(404).json({ success: false, error: 'System prompt not found' });
                return;
            }
            res.json({ success: true, systemPrompt: updated });
        }
        catch (error) {
            console.error('Error updating system prompt:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }
}
exports.ChatController = ChatController;
//# sourceMappingURL=chat.controller.js.map