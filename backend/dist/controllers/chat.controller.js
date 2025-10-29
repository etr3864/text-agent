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
let pdfParse = null;
const loadPdfParse = async () => {
    if (!pdfParse) {
        try {
            const mod = await Promise.resolve().then(() => __importStar(require('pdf-parse')));
            pdfParse = typeof mod === 'function' ? mod : (typeof mod?.default === 'function' ? mod.default : null);
        }
        catch (e) {
            const modCjs = require('pdf-parse');
            pdfParse = typeof modCjs === 'function' ? modCjs : (typeof modCjs?.default === 'function' ? modCjs.default : null);
        }
    }
    if (typeof pdfParse !== 'function') {
        throw new Error('pdf-parse module did not export a function');
    }
    return pdfParse;
};
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
            const uploadedFile = req.file;
            const pdfBuffer = uploadedFile.buffer;
            const originalName = uploadedFile.originalname || 'document.pdf';
            const LLAMAINDEX_API_KEY = 'llx-p1rqcgG6HbG31MZU6zpip5BYpF95ckuNtliioEHWP8CZfVeG';
            const LLAMAINDEX_BASE_URL = 'https://api.llamaindex.ai';
            if (LLAMAINDEX_API_KEY && LLAMAINDEX_BASE_URL) {
                try {
                    const liForm = new form_data_1.default();
                    liForm.append('file', pdfBuffer, {
                        filename: originalName,
                        contentType: 'application/pdf',
                    });
                    const liUrl = `${LLAMAINDEX_BASE_URL}/api/parsing/upload`;
                    const liResp = await axios_1.default.post(liUrl, liForm, {
                        headers: {
                            ...liForm.getHeaders(),
                            Authorization: `Bearer ${LLAMAINDEX_API_KEY}`,
                        },
                        timeout: 120000,
                        maxBodyLength: Infinity,
                    });
                    try {
                        const preview = JSON.stringify(liResp.data).slice(0, 1500);
                        console.debug(`[LlamaParse] upload response (preview): ${preview}`);
                    }
                    catch { }
                    const jobId = (liResp.data?.id || liResp.data?.job?.id || liResp.data?.job_id || '').toString();
                    if (jobId) {
                        const pollUrl = `${LLAMAINDEX_BASE_URL}/api/parsing/jobs/${jobId}`;
                        const startTs = Date.now();
                        let lastState;
                        while (Date.now() - startTs < 120000) {
                            const jr = await axios_1.default.get(pollUrl, {
                                headers: { Authorization: `Bearer ${LLAMAINDEX_API_KEY}` },
                                timeout: 15000,
                            });
                            const data = jr.data || {};
                            try {
                                const preview = JSON.stringify(data).slice(0, 2000);
                                console.debug(`[LlamaParse] poll state preview: ${preview}`);
                            }
                            catch { }
                            const state = (data.state || data.status || '').toString().toUpperCase();
                            lastState = state;
                            if (state === 'SUCCESS' || state === 'SUCCEEDED' || state === 'COMPLETED') {
                                const candidates = [
                                    data.text,
                                    data.output,
                                    data.result?.text,
                                    data.result?.output,
                                    Array.isArray(data.pages) ? data.pages.map((p) => p.text).join('\n\n') : undefined,
                                    Array.isArray(data.documents) ? data.documents.map((d) => d.text || d.content).join('\n\n') : undefined,
                                ];
                                const joined = candidates
                                    .filter((v) => typeof v === 'string' && v.trim().length > 0)
                                    .map((v) => v.trim());
                                const liText = (joined[0] || '').toString().trim();
                                if (liText.length > 0) {
                                    res.json({ success: true, text: liText, pages: 0 });
                                    return;
                                }
                                break;
                            }
                            if (state === 'FAILED' || state === 'ERROR' || state === 'CANCELLED') {
                                break;
                            }
                            await new Promise((r) => setTimeout(r, 1500));
                        }
                        if (lastState && lastState !== 'SUCCESS' && lastState !== 'SUCCEEDED' && lastState !== 'COMPLETED') {
                            console.warn(`LlamaParse job ${jobId} ended without success (state=${lastState})`);
                        }
                    }
                    else {
                        const liTextImmediate = (liResp.data?.text || liResp.data?.output || '').toString().trim();
                        if (liTextImmediate && liTextImmediate.length > 0) {
                            res.json({ success: true, text: liTextImmediate, pages: 0 });
                            return;
                        }
                    }
                }
                catch (e) {
                    console.warn('LlamaParse failed, will try pdf-parse/OCR as fallback');
                }
            }
            try {
                const pdfParser = await loadPdfParse();
                const parsed = await pdfParser(pdfBuffer);
                const text = (parsed.text || '').trim();
                const numpages = parsed.numpages || 0;
                if (text.length > 0) {
                    const hebrewMatches = text.match(/[\u0590-\u05FF]/g) || [];
                    const hebrewRatio = hebrewMatches.length / Math.max(text.length, 1);
                    if (hebrewRatio >= 0.2) {
                        res.json({ success: true, text, pages: numpages });
                        return;
                    }
                    else {
                        console.warn('pdf-parse produced low Hebrew ratio; falling back to OCR');
                    }
                }
            }
            catch (pdfErr) {
                console.warn('pdf-parse failed:', pdfErr instanceof Error ? pdfErr.message : pdfErr);
            }
            if (!env_js_1.config.ocr?.apiKey) {
                res.json({ success: true, text: '', pages: 0 });
                return;
            }
            const callOcr = async (extraFields = {}) => {
                const formData = new form_data_1.default();
                formData.append('file', pdfBuffer, {
                    filename: originalName,
                    contentType: 'application/pdf',
                });
                formData.append('apikey', env_js_1.config.ocr.apiKey);
                formData.append('OCREngine', '1');
                formData.append('filetype', 'PDF');
                formData.append('detectOrientation', 'true');
                formData.append('isTable', 'false');
                formData.append('scale', 'true');
                for (const [k, v] of Object.entries(extraFields)) {
                    formData.append(k, String(v));
                }
                const response = await axios_1.default.post('https://api.ocr.space/parse/image', formData, {
                    headers: formData.getHeaders(),
                    maxBodyLength: Infinity,
                    timeout: 30000,
                });
                return response.data;
            };
            let ocrResult = null;
            try {
                ocrResult = await callOcr();
                if (ocrResult?.IsErroredOnProcessing && ocrResult?.ErrorMessage) {
                    const msg = Array.isArray(ocrResult.ErrorMessage)
                        ? ocrResult.ErrorMessage.join(', ')
                        : ocrResult.ErrorMessage;
                    console.warn('OCR.space error (default):', msg);
                    ocrResult = await callOcr({ OCREngine: '2', language: 'auto' });
                    if (ocrResult?.IsErroredOnProcessing && ocrResult?.ErrorMessage) {
                        const msg2 = Array.isArray(ocrResult.ErrorMessage)
                            ? ocrResult.ErrorMessage.join(', ')
                            : ocrResult.ErrorMessage;
                        console.warn('OCR.space error (auto):', msg2);
                        ocrResult = await callOcr({ language: 'eng' });
                    }
                }
            }
            catch (ocrErr) {
                console.warn('OCR.space call failed:', ocrErr instanceof Error ? ocrErr.message : ocrErr);
            }
            let fullText = '';
            let pages = 0;
            if (ocrResult?.ParsedResults && Array.isArray(ocrResult.ParsedResults)) {
                fullText = ocrResult.ParsedResults.map((p) => p.ParsedText || '').join('\n\n');
                pages = ocrResult.ParsedResults.length;
            }
            res.json({ success: true, text: (fullText || '').trim(), pages });
        }
        catch (error) {
            console.error('Error parsing PDF:', error);
            res.status(500).json({ success: false, error: 'Failed to parse PDF' });
        }
    }
    async generateDynamicQuestions(req, res) {
        try {
            const { businessName, businessField, businessGoal, systemPromptId, systemPromptText } = req.body || {};
            if (!businessName || !businessField || !businessGoal) {
                res.status(400).json({ success: false, error: 'Business name, field, and goal are required' });
                return;
            }
            let resolvedSystemPrompt = typeof systemPromptText === 'string' && systemPromptText.trim().length > 0
                ? systemPromptText.trim()
                : undefined;
            if (!resolvedSystemPrompt && systemPromptId) {
                const sp = await this.supabaseService.getSystemPrompt(systemPromptId);
                if (sp?.prompt) {
                    resolvedSystemPrompt = sp.prompt;
                }
            }
            if (!resolvedSystemPrompt) {
                resolvedSystemPrompt = 'אתה סוכנת AI חכמה ומועילה. ענה בעברית בצורה ברורה וידידותית.';
            }
            const prompt = `אתה מומחה ביצירת שאלות מותאמות לסוכנות AI.

פרטים שנאספו מהמשתמש:
שם העסק: ${businessName}
תחום העסק: ${businessField}
מטרת הסוכן: ${businessGoal}

על סמך הפרטים האלה, שאל בדיוק 6-8 שאלות נוספות כדי להשלים את הסיסטם פרומפט.

🚨 חשוב מאוד: אתה חייב לשאול לפחות 6 שאלות, לא פחות! בין 6 ל-8 שאלות בסך הכול.

השאלות צריכות להיות מפורטות וממוקדות, עם דוגמאות ספציפיות:

1. **שם הסוכן ומגדר** - שאל על שם ומגדר (זכר/נקבה) עם דוגמאות כמו "איך הסוכן יקרא לעצמו? (דוגמה: דנה, עמית, רון)"

2. **תכונות אופי ספציפיות** - שאל על תכונות אופי רלוונטיות לתחום עם דוגמאות כמו "איך הסוכן צריך להתנהג? (דוגמה: מקצועי, ידידותי, סבלני)"

3. **סגנון תקשורת מפורט** - שאל על סגנון דיבור עם דוגמאות כמו "איך הסוכן צריך לדבר? (דוגמה: קליל, מקצועי, עם סלנג ישראלי)"

4. **תהליכי עבודה ספציפיים** - שאל על מה לעשות במקרים קשים עם דוגמאות כמו "מה לעשות כשלקוח כועס? (דוגמה: להקשיב, להתנצל, להציע פתרון)"

5. **מגבלות ואזהרות** - שאל על מה לא לדבר עליו עם דוגמאות כמו "מה אסור לדבר עליו? (דוגמה: מחירים של מתחרים, מידע אישי)"

6. **דוגמאות מעשיות** - שאל על דוגמאות לפתיחה עם דוגמאות כמו "איך הסוכן יפתח שיחה? (דוגמה: 'היי! איך אפשר לעזור?')"

⚠️ אם תשאל פחות מ-6 שאלות, התשובה שלך לא תתקבל!

השאלות צריכות להיות מותאמות לתחום העסק: ${businessField}`;
            const response = await this.aiService.generateResponse([{ role: 'user', content: prompt }], { temperature: 0.7, maxTokens: 500, systemPrompt: resolvedSystemPrompt }, false);
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
            const pdfPrefix = 'תוכן מקובץ PDF:';
            const userAnswers = [];
            const pdfChunks = [];
            for (const a of answers) {
                if (typeof a === 'string' && a.trim().startsWith(pdfPrefix)) {
                    const onlyText = a.replace(pdfPrefix, '').trim();
                    if (onlyText)
                        pdfChunks.push(onlyText);
                }
                else {
                    userAnswers.push(a);
                }
            }
            const pdfSection = pdfChunks.length > 0
                ? `\n\nקונטקסט נוסף מה-PDF (תוספת בלבד, לא במקום תשובות המשתמש):\n${pdfChunks.join('\n')}\n\n`
                : '\n';
            const prompt = `אתה מומחה ביצירת סיסטם פרומפטים לסוכנות AI.

תבסס על התשובות הבאות וצור סיסטם פרומפט מקצועי:
${userAnswers.join('\n')}
${pdfSection}
חשוב מאוד:
- התוכן מה-PDF הוא תוספת בלבד. אם קיים פער מול תשובות המשתמש, עדיפות מוחלטת לתשובות המשתמש.
- אל תחליף או תסיר פרטים מהתשובות; רק העשר בעזרת ה-PDF.

צור סיסטם פרומפט שכולל:
1. **זהות הסוכן** - שם, מגדר, תכונות אופי
2. **תפקיד ומטרה** - מה הסוכן עושה ומה המטרה
3. **סגנון תקשורת** - איך לדבר עם הלקוח (חשוב: פנה ללקוח בלשון המתאימה למגדר שלו)
4. **הנחיות עבודה** - איך לטפל במקרים שונים
5. **מגבלות** - מה לא לדבר עליו
6. **דוגמאות והנחיות מעשיות** -
   - פתיחות שיחה, תגובות לדוגמא, ותסריטי שיחה מעשיים.
   - אם בקונטקסט ה-PDF קיימים "תרחישי שיחה"/"תסריטים"/"סקריפטים" — שלב אותם כאן באופן מסודר ומדויק (רשימות ממוספרות, כותרות קצרות), בלי למחוק פרטים מהתשובות. אם צריך, תמצת משפטית לשמירה על בהירות.

**חשוב:** השתמש במידע מהתשובות. אם מידע חסר, השתמש בערכים כלליים ומקצועיים.
**חשוב מאוד:** פנה ללקוח בלשון המתאימה למגדר שלו (זכר/נקבה) כפי שצוין בתשובות.
**לגבי תרחישי שיחה מה-PDF:** אם נמצאו, שלב אותם תחת סעיף 6 כדוגמאות ותסריטים קונקרטיים (כולל וריאציות, התנגדויות נפוצות ומענה מומלץ), תוך התאמה לסגנון התקשורת שצוין.

ענה רק עם הסיסטם פרומפט המלא, ללא הסבר נוסף.`;
            const response = await this.aiService.generateResponse([{ role: 'user', content: prompt }], { temperature: 0.7, maxTokens: 8000 }, false);
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