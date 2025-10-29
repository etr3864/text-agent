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
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppController = void 0;
const wasender_service_js_1 = require("../services/wasender.service.js");
const supabase_service_js_1 = require("../services/supabase.service.js");
const ai_service_js_1 = require("../services/ai.service.js");
const media_service_js_1 = require("../services/media.service.js");
const conversation_service_js_1 = require("../services/conversation.service.js");
class WhatsAppController {
    constructor() {
        this.supabase = new supabase_service_js_1.SupabaseService();
        this.aiService = new ai_service_js_1.AIService();
        this.conversationService = new conversation_service_js_1.ConversationService();
        this.conversationIds = new Map();
        this.messageBuffers = new Map();
        this.DEBOUNCE_DELAY = 10000;
    }
    async processMessageWithDebounce(senderPhone, text, userName, timestamp, audioUrl, imageUrl, audioMediaKey, imageMediaKey) {
        let buffer = this.messageBuffers.get(senderPhone);
        if (!buffer) {
            buffer = {
                messages: [],
                isProcessing: false,
                lastMessageTime: Date.now()
            };
            this.messageBuffers.set(senderPhone, buffer);
        }
        buffer.messages.push({
            text,
            userName,
            timestamp,
            audioUrl,
            imageUrl,
            audioMediaKey,
            imageMediaKey,
        });
        buffer.lastMessageTime = Date.now();
        console.log(`📦 Message buffered for ${senderPhone} (${buffer.messages.length} total)`);
        if (buffer.timer) {
            clearTimeout(buffer.timer);
        }
        buffer.timer = setTimeout(async () => {
            if (buffer.isProcessing) {
                console.log(`⏳ Already processing messages for ${senderPhone}, skipping`);
                return;
            }
            buffer.isProcessing = true;
            try {
                const bufferedMessages = [...buffer.messages];
                buffer.messages = [];
                this.messageBuffers.delete(senderPhone);
                console.log(`🔄 Processing ${bufferedMessages.length} buffered messages for ${senderPhone}`);
                let combinedText = bufferedMessages
                    .map((m) => m.text)
                    .filter((t) => t)
                    .join('\n');
                if (bufferedMessages.length > 1) {
                    const multiMessageGuidance = `

**הנחיה מיוחדת: המשתמש שלח מספר הודעות!**
- המשתמש שלח ${bufferedMessages.length} הודעות
- עני לכל ההודעות בתגובה אחת מקיפה
- התייחסי לכל הנקודות שהמשתמש העלה
- שמרי על זרימה טבעית בין הנושאים
`;
                    combinedText = multiMessageGuidance + combinedText;
                    console.log(`📝 Multi-message guidance added for ${senderPhone}`);
                }
                const latest = bufferedMessages[bufferedMessages.length - 1];
                const userWithPrompt = await this.supabase.getUserWithSystemPromptByPhone(senderPhone);
                if (userWithPrompt?.user?.whatsapp_status === 'stopped') {
                    console.log(`Simulation stopped for ${senderPhone}, skipping response`);
                    return;
                }
                const systemPrompt = userWithPrompt?.systemPrompt?.prompt;
                let conversationId = this.conversationIds.get(senderPhone);
                const conversationResponse = await this.conversationService.sendMessage({
                    message: combinedText,
                    userPhone: senderPhone,
                    conversationId: conversationId,
                    systemPrompt: systemPrompt,
                    customerGender: userWithPrompt?.user?.customer_gender || undefined
                });
                if (conversationResponse?.conversationId) {
                    this.conversationIds.set(senderPhone, conversationResponse.conversationId);
                }
                const replyText = conversationResponse?.message?.content?.trim();
                if (replyText && replyText.length > 0) {
                    await wasender_service_js_1.wasenderService.sendMessage(senderPhone, replyText);
                    if (userWithPrompt?.user?.id) {
                        await this.supabase.updateUserWhatsAppStatus(userWithPrompt.user.id, 'active');
                    }
                }
            }
            catch (error) {
                console.error('❌ Error processing buffered messages:', { senderPhone, error });
            }
            finally {
                buffer.isProcessing = false;
            }
        }, this.DEBOUNCE_DELAY);
    }
    getImageExtension(mimetype) {
        if (mimetype.includes('jpeg') || mimetype.includes('jpg'))
            return '.jpg';
        if (mimetype.includes('png'))
            return '.png';
        if (mimetype.includes('gif'))
            return '.gif';
        if (mimetype.includes('webp'))
            return '.webp';
        return '.jpg';
    }
    normalizePhoneNumber(input) {
        let digits = (input || '').replace(/\D+/g, '');
        if (digits.startsWith('00')) {
            digits = digits.slice(2);
        }
        if (digits.startsWith('972')) {
            return digits;
        }
        if (digits.startsWith('0')) {
            return '972' + digits.slice(1);
        }
        if (!digits.startsWith('972')) {
            return '972' + digits;
        }
        return digits;
    }
    async webhook(req, res) {
        try {
            const payload = req.body;
            console.log('Received WhatsApp webhook:', JSON.stringify(payload));
            const event = payload?.event;
            const data = payload?.data;
            if ((event === 'messages.upsert' || event === 'messages.received') && data?.messages) {
                const msg = data.messages;
                const message = Array.isArray(msg) ? msg[0] : msg;
                if (message?.key?.fromMe) {
                    console.log('Skipping message sent by bot (fromMe=true)');
                    res.status(200).json({ ok: true });
                    return;
                }
                let text = message?.message?.conversation ||
                    message?.conversation ||
                    message?.text?.body ||
                    message?.message?.extendedTextMessage?.text ||
                    '';
                const pushName = message?.pushName || message?.message?.pushName || '';
                const messageTimestamp = message?.messageTimestamp || message?.timestamp || Date.now();
                let audioUrl;
                let audioMime;
                let audioMediaKey;
                let imageUrl;
                let imageMime;
                let imageMediaKey;
                if (!text) {
                    const mm = message?.message || {};
                    const audio = mm.audioMessage || mm.audio || mm.ptt || mm.voice || mm.message?.audioMessage;
                    if (audio) {
                        audioUrl = audio.directPath || audio.url || audio.mediaUrl || audio.downloadUrl;
                        audioMime = audio.mimetype || audio.mimeType;
                        audioMediaKey = audio.mediaKey;
                    }
                    const image = mm.imageMessage || mm.image || mm.message?.imageMessage;
                    if (image) {
                        imageUrl = image.directPath || image.url || image.mediaUrl || image.downloadUrl;
                        imageMime = image.mimetype || image.mimeType;
                        imageMediaKey = image.mediaKey;
                    }
                    if (!audioUrl && !imageUrl && message?.mediaUrl) {
                        audioUrl = message.mediaUrl;
                    }
                }
                const remoteJid = message?.key?.remoteJid || message?.from || '';
                const digitsOnly = (remoteJid || '').replace(/\D+/g, '');
                let senderPhone = digitsOnly;
                if (senderPhone) {
                    senderPhone = this.normalizePhoneNumber(senderPhone);
                }
                console.log('Incoming message (parsed):', { text, senderPhone, hasAudio: !!audioUrl, hasImage: !!imageUrl });
                if (!senderPhone || !/^972[0-9]{9}$/.test(senderPhone)) {
                    console.warn('Webhook missing valid sender phone');
                    res.status(200).json({ ok: true });
                    return;
                }
                if (text) {
                    await this.processMessageWithDebounce(senderPhone, text, pushName, messageTimestamp);
                }
                else if (audioUrl) {
                    try {
                        console.log('Processing audio:', { audioUrl, audioMediaKey, audioMime });
                        let inputPath;
                        if (audioMediaKey) {
                            inputPath = await media_service_js_1.mediaService.downloadAndDecryptAudio(audioUrl, audioMediaKey, audioMime || 'audio/ogg');
                        }
                        else {
                            inputPath = await media_service_js_1.mediaService.downloadToTemp(audioUrl, '.ogg');
                        }
                        const wavPath = await media_service_js_1.mediaService.convertToWav16kMono(inputPath);
                        const transcript = await this.aiService.transcribeWav(wavPath);
                        console.log('Transcribed text:', transcript);
                        await this.processMessageWithDebounce(senderPhone, transcript, pushName, messageTimestamp, audioUrl, undefined, audioMediaKey);
                        await media_service_js_1.mediaService.cleanupTemp(wavPath);
                    }
                    catch (e) {
                        console.error('Audio handling failed:', e);
                        await this.processMessageWithDebounce(senderPhone, 'לא הצלחתי להבין את ההקלטה, אפשר לנסח בטקסט?');
                    }
                }
                else if (imageUrl) {
                    try {
                        console.log('Processing image:', { imageUrl, imageMediaKey, imageMime });
                        let inputPath;
                        if (imageMediaKey) {
                            inputPath = await media_service_js_1.mediaService.downloadAndDecryptImage(imageUrl, imageMediaKey, imageMime || 'image/jpeg');
                        }
                        else {
                            const extension = this.getImageExtension(imageMime || 'image/jpeg');
                            inputPath = await media_service_js_1.mediaService.downloadToTemp(imageUrl, extension);
                        }
                        const { ImageAnalysisService } = await Promise.resolve().then(() => __importStar(require('../services/image-analysis.service.js')));
                        const imageAnalysisService = new ImageAnalysisService();
                        const imageAnalysis = await imageAnalysisService.analyzeImage(inputPath);
                        const businessAnalysis = await imageAnalysisService.analyzeImageForBusiness(inputPath, 'שירותי שיווק בפייסבוק, ניהול קמפיינים, יצירת תוכן');
                        const combinedAnalysis = `המשתמש שלח תמונה. ניתוח התמונה: ${imageAnalysis}\n\nהקשר עסקי: ${businessAnalysis}`;
                        console.log('Image analysis:', combinedAnalysis);
                        await this.processMessageWithDebounce(senderPhone, combinedAnalysis, pushName, messageTimestamp, undefined, imageUrl, undefined, imageMediaKey);
                        await media_service_js_1.mediaService.cleanupTemp(inputPath);
                    }
                    catch (e) {
                        console.error('Image handling failed:', e);
                        await this.processMessageWithDebounce(senderPhone, 'לא הצלחתי לנתח את התמונה, אפשר לנסות שוב או לכתוב לי בטקסט?');
                    }
                }
            }
            if (event === 'chats.update' && data?.chats) {
                const chats = data.chats;
                const firstMsg = Array.isArray(chats?.messages) ? chats.messages[0] : chats?.messages?.[0];
                const fromMe = firstMsg?.message?.key?.fromMe;
                if (fromMe === true) {
                    res.status(200).json({ ok: true });
                    return;
                }
                let text = firstMsg?.message?.message?.conversation ||
                    firstMsg?.message?.conversation ||
                    firstMsg?.message?.text?.body ||
                    firstMsg?.message?.message?.extendedTextMessage?.text ||
                    '';
                const pushName = firstMsg?.pushName || firstMsg?.message?.pushName || '';
                const messageTimestamp = firstMsg?.messageTimestamp || firstMsg?.timestamp || Date.now();
                let audioUrl;
                let mediaKey;
                if (!text) {
                    const mm = firstMsg?.message || {};
                    const audio = mm.audioMessage || mm.audio || mm.ptt || mm.voice || mm.message?.audioMessage;
                    if (audio) {
                        audioUrl = audio.directPath || audio.url || audio.mediaUrl || audio.downloadUrl;
                        mediaKey = audio.mediaKey;
                    }
                    if (!audioUrl && firstMsg?.mediaUrl) {
                        audioUrl = firstMsg.mediaUrl;
                    }
                }
                const chatsId = chats?.id || '';
                const remoteJid = chatsId || firstMsg?.message?.key?.remoteJid || '';
                const digitsOnly = (remoteJid || '').replace(/\D+/g, '');
                let senderPhone = digitsOnly ? this.normalizePhoneNumber(digitsOnly) : '';
                console.log('Incoming chats.update (parsed):', { text, senderPhone, hasAudio: !!audioUrl });
                if (!senderPhone || !/^972[0-9]{9}$/.test(senderPhone)) {
                    res.status(200).json({ ok: true });
                    return;
                }
                if (text) {
                    await this.processMessageWithDebounce(senderPhone, text, pushName, messageTimestamp);
                }
                else if (audioUrl) {
                    try {
                        console.log('Processing audio (chats.update):', { audioUrl, mediaKey });
                        let inputPath;
                        if (mediaKey) {
                            inputPath = await media_service_js_1.mediaService.downloadAndDecryptAudio(audioUrl, mediaKey, 'audio/ogg');
                        }
                        else {
                            inputPath = await media_service_js_1.mediaService.downloadToTemp(audioUrl, '.ogg');
                        }
                        const wavPath = await media_service_js_1.mediaService.convertToWav16kMono(inputPath);
                        const transcript = await this.aiService.transcribeWav(wavPath);
                        console.log('Transcribed text (chats.update):', transcript);
                        await this.processMessageWithDebounce(senderPhone, transcript, pushName, messageTimestamp, audioUrl, undefined, mediaKey);
                        await media_service_js_1.mediaService.cleanupTemp(wavPath);
                    }
                    catch (e) {
                        console.error('Audio handling failed (chats.update):', e);
                        await this.processMessageWithDebounce(senderPhone, 'לא הצלחתי להבין את ההקלטה, אפשר לנסח בטקסט?');
                    }
                }
            }
            res.status(200).json({ ok: true });
        }
        catch (error) {
            console.error('Error in WhatsApp webhook:', error);
            res.status(200).json({ ok: true });
        }
    }
    async sendFirstMessage(req, res) {
        try {
            const { systemPromptId, userPhone, text } = req.body || {};
            let phoneNumber = userPhone;
            let userName;
            let userBusinessName;
            let systemPromptText;
            if (!phoneNumber && systemPromptId) {
                const systemPrompt = await this.supabase.getSystemPrompt(systemPromptId);
                if (systemPrompt) {
                    systemPromptText = systemPrompt.prompt;
                    const user = await this.supabase.getUserBySystemPromptId(systemPromptId);
                    if (user && user.phone_number) {
                        phoneNumber = user.phone_number;
                        userName = user.name || undefined;
                        userBusinessName = user.business_name || undefined;
                    }
                }
            }
            if (!phoneNumber) {
                res.status(400).json({ success: false, error: 'Phone number is required. Either provide userPhone or systemPromptId' });
                return;
            }
            phoneNumber = this.normalizePhoneNumber(phoneNumber);
            if (!/^972[0-9]{9}$/.test(phoneNumber)) {
                res.status(400).json({ success: false, error: 'Invalid phone number after normalization' });
                return;
            }
            const existingUser = await this.supabase.getUserByPhone(phoneNumber);
            if (existingUser && (existingUser.whatsapp_status === 'sent' || existingUser.first_message_sent_at)) {
                res.json({ success: true, message: 'First message already sent previously' });
                return;
            }
            const userWithPrompt = await this.supabase.getUserWithSystemPromptByPhone(phoneNumber);
            const systemPrompt = userWithPrompt?.systemPrompt?.prompt || systemPromptText;
            const agentName = this.extractAgentName(systemPrompt);
            const customerName = userName || userBusinessName || undefined;
            let firstMessage = '';
            if (customerName) {
                firstMessage = `היי ${customerName} אני ${agentName} מתחילים שיחת הדמייה`;
            }
            else {
                firstMessage = `היי אני ${agentName} מתחילים שיחת הדמייה`;
            }
            const wasenderResponse = await wasender_service_js_1.wasenderService.sendMessage(phoneNumber, firstMessage);
            if (!wasenderResponse.success) {
                res.status(502).json({ success: false, error: 'Failed to send via Wasender', details: wasenderResponse.error });
                return;
            }
            const user = await this.supabase.getUserByPhone(phoneNumber);
            if (user) {
                await this.supabase.updateUserWhatsAppStatus(user.id, 'sent');
            }
            res.json({ success: true, message: 'First message sent successfully via AI' });
        }
        catch (error) {
            console.error('Error in sendFirstMessage:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }
    extractAgentName(systemPrompt) {
        if (!systemPrompt)
            return 'נועה';
        const lines = systemPrompt.split('\n').map(l => l.trim()).filter(Boolean);
        const text = lines.join(' ');
        const patterns = [
            /שמי\s+([\u0590-\u05FFA-Za-z"']{2,30})/,
            /אני\s+([\u0590-\u05FFA-Za-z"']{2,30})/,
            /הסוכנת\s+([\u0590-\u05FFA-Za-z"']{2,30})/,
            /שם\s+הסוכנ[ת]\s*[:\-]?\s*([\u0590-\u05FFA-Za-z"']{2,30})/
        ];
        for (const re of patterns) {
            const m = text.match(re);
            if (m && m[1]) {
                return m[1].replace(/["']/g, '').trim();
            }
        }
        return 'נועה';
    }
    async stopSimulation(req, res) {
        try {
            const { userPhone } = req.body;
            if (!userPhone) {
                res.status(400).json({ success: false, error: 'User phone number is required' });
                return;
            }
            const normalizedPhone = this.normalizePhoneNumber(userPhone);
            if (!/^972[0-9]{9}$/.test(normalizedPhone)) {
                res.status(400).json({ success: false, error: 'Invalid phone number format' });
                return;
            }
            const user = await this.supabase.getUserByPhone(normalizedPhone);
            if (!user) {
                res.status(404).json({ success: false, error: 'User not found' });
                return;
            }
            await this.supabase.updateUserWhatsAppStatus(user.id, 'stopped');
            res.json({ success: true, message: 'Simulation stopped successfully' });
        }
        catch (error) {
            console.error('Error in stopSimulation:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }
}
exports.WhatsAppController = WhatsAppController;
//# sourceMappingURL=whatsapp.controller.js.map