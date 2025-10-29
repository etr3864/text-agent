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
exports.AIService = void 0;
const openai_1 = __importDefault(require("openai"));
const env_js_1 = require("../config/env.js");
const supabase_service_js_1 = require("./supabase.service.js");
class AIService {
    constructor() {
        this.openai = new openai_1.default({
            apiKey: env_js_1.config.openai.apiKey,
        });
        this.supabaseService = new supabase_service_js_1.SupabaseService();
        this.defaultConfig = {
            model: env_js_1.config.openai.model,
            temperature: 0.3,
            maxTokens: 1000,
            systemPrompt: 'אתה סוכנת AI חכמה ומועילה. ענה בעברית בצורה ברורה וידידותית. - תשמרי על זרימה טבעית, בלי לחזור על עצמך.\n' +
                '- אם הלקוח קצר – תעני בקצרה. אם מפורט – תתאימי את עצמך.\n' +
                '- אם כבר יש פרטים עליו, תשתמשי בהם.\n' +
                '- אם הוא מתנגד – תתייחסי בעדינות ואל תילחצי למכור.\n' +
                '- תמיד תשמרי על שפה אנושית, קלילה ומזמינה.\n' +
                '- לשאול רק שאלה אחת בכל הודעה \n' +
                '- לענות עד 150 תווים כולל רווחים\n' +
                '- אין לחרוג מהגבלה זו בשום מקרה\n' +
                '- אם התגובה ארוכה מדי, קיצר אותה\n' +
                '- תמיד ספור את התווים לפני השליחה\n' +
                '- השתמש בנקודות עצירה טבעיות (נקודה, סימן שאלה)\n' +
                '- הימנע ממשפטים ארוכים מדי'
        };
    }
    async transcribeWav(filePath) {
        try {
            const file = await (await Promise.resolve().then(() => __importStar(require('fs')))).promises.readFile(filePath);
            const response = await this.openai.audio.transcriptions.create({
                file: new File([file], 'audio.wav', { type: 'audio/wav' }),
                model: 'whisper-1',
                language: 'he',
                response_format: 'text',
            });
            return typeof response === 'string' ? response : response.text || '';
        }
        catch (e) {
            console.error('Transcription failed:', e);
            throw new Error('Failed to transcribe audio');
        }
    }
    async generateResponse(messages, customConfig, isForWhatsApp = false) {
        try {
            const aiConfig = { ...this.defaultConfig, ...customConfig };
            let systemPromptToUse = (aiConfig.systemPrompt && typeof aiConfig.systemPrompt === 'string' && aiConfig.systemPrompt.trim().length > 0)
                ? aiConfig.systemPrompt.trim()
                : '';
            if (!systemPromptToUse) {
                systemPromptToUse = this.defaultConfig.systemPrompt;
            }
            let guardrails = '';
            try {
                const fs = require('fs');
                const path = require('path');
                const filePath = path.resolve(__dirname, '..', 'assets', 'global-guardrails.txt');
                if (fs.existsSync(filePath)) {
                    guardrails = fs.readFileSync(filePath, 'utf8');
                }
            }
            catch { }
            const behavioralGuidelines = `
========================
🤖 כללי בינה - התנהגות
========================
- תשמרי על זרימה טבעית ושפה אנושית.
- תשאלי שאלה אחת בכל הודעה בלבד.
- אל תחזרי על עצמך ואל תמהרי למכור.
- אם הלקוח קצר – תעני בקצרה. אם מפורט – תזרמי איתו.
- שמרי על איזון בין הומור קליל למקצועיות.
- אם נדרשת הבהרה, השתמשי בשם הלקוח.
- תמיד תשמרי על אווירה מזמינה, עם ביטחון ואמפתיה.
- **חשוב מאוד: אם הלקוח שלח מספר הודעות - עני על כולן בהודעה אחת בלבד!**
- **אל תשלחי מספר הודעות נפרדות - תמיד הודעה אחת מקיפה לכל מה שהלקוח כתב**
========================`;
            const combinedSystem = guardrails
                ? `${behavioralGuidelines}\n\n${guardrails}\n\n${systemPromptToUse}`
                : `${behavioralGuidelines}\n\n${systemPromptToUse}`;
            const openaiMessages = [];
            openaiMessages.push({ role: 'system', content: combinedSystem });
            openaiMessages.push(...messages.map(msg => ({
                role: msg.role,
                content: msg.content
            })));
            if (isForWhatsApp) {
                const systemPromptWithLimits = `${combinedSystem}

**חוקים חשובים לתגובה:**
- התגובה חייבת להיות קצרה ומדויקת
- מקסימום 150 תווים כולל רווחים
- אין לחרוג מהגבלה זו בשום מקרה
- אם התגובה ארוכה מדי, קיצר אותה
- תמיד ספור את התווים לפני השליחה`;
                openaiMessages[0].content = systemPromptWithLimits;
            }
            await new Promise(resolve => setTimeout(resolve, 4000));
            const completion = await this.openai.chat.completions.create({
                model: aiConfig.model,
                messages: openaiMessages,
                temperature: aiConfig.temperature,
                max_tokens: aiConfig.maxTokens,
            });
            const response = completion.choices[0]?.message?.content || '';
            const usage = completion.usage;
            const validatedResponse = isForWhatsApp ? this.validateResponseLength(response) : response;
            return {
                content: validatedResponse,
                usage: usage ? {
                    promptTokens: usage.prompt_tokens,
                    completionTokens: usage.completion_tokens,
                    totalTokens: usage.total_tokens
                } : undefined
            };
        }
        catch (error) {
            console.error('Error generating AI response:', error);
            throw new Error('Failed to generate AI response');
        }
    }
    validateResponseLength(response) {
        const maxLength = 150;
        if (response.length <= maxLength) {
            return response;
        }
        let shortenedResponse = response.substring(0, maxLength - 3) + '...';
        const lastSpace = shortenedResponse.lastIndexOf(' ');
        if (lastSpace > maxLength * 0.8) {
            shortenedResponse = response.substring(0, lastSpace) + '...';
        }
        console.warn(`⚠️ Response truncated from ${response.length} to ${shortenedResponse.length} characters`);
        return shortenedResponse;
    }
    async generateSystemPrompt(prompt) {
        try {
            const completion = await this.openai.chat.completions.create({
                model: this.defaultConfig.model,
                messages: [
                    {
                        role: 'system',
                        content: 'אתה עוזר ליצור system prompts יעילים. ענה בעברית.'
                    },
                    {
                        role: 'user',
                        content: `צור system prompt עבור: ${prompt}`
                    }
                ],
                temperature: 0.3,
                max_tokens: 500,
            });
            return completion.choices[0]?.message?.content || '';
        }
        catch (error) {
            console.error('Error generating system prompt:', error);
            throw new Error('Failed to generate system prompt');
        }
    }
}
exports.AIService = AIService;
//# sourceMappingURL=ai.service.js.map