"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppController = void 0;
const wasender_service_js_1 = require("../services/wasender.service.js");
const supabase_service_js_1 = require("../services/supabase.service.js");
const ai_service_js_1 = require("../services/ai.service.js");
class WhatsAppController {
    constructor() {
        this.supabase = new supabase_service_js_1.SupabaseService();
        this.aiService = new ai_service_js_1.AIService();
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
                const text = message?.message?.conversation ||
                    message?.conversation ||
                    message?.text?.body ||
                    message?.message?.extendedTextMessage?.text ||
                    '';
                const remoteJid = message?.key?.remoteJid || message?.from || '';
                const digitsOnly = (remoteJid || '').replace(/\D+/g, '');
                let senderPhone = digitsOnly;
                if (senderPhone) {
                    senderPhone = this.normalizePhoneNumber(senderPhone);
                }
                console.log('Incoming message (parsed):', { text, senderPhone });
                if (!text || !senderPhone || !/^972[0-9]{9}$/.test(senderPhone)) {
                    console.warn('Webhook message missing text or valid sender phone');
                    res.status(200).json({ ok: true });
                    return;
                }
                const userWithPrompt = await this.supabase.getUserWithSystemPromptByPhone(senderPhone);
                const systemPrompt = userWithPrompt?.systemPrompt?.prompt;
                const aiResponse = await this.aiService.generateResponse([{ role: 'user', content: text }], systemPrompt ? { systemPrompt } : undefined);
                const replyText = aiResponse?.content?.trim();
                if (replyText && replyText.length > 0) {
                    await wasender_service_js_1.wasenderService.sendMessage(senderPhone, replyText);
                    if (userWithPrompt?.user?.id) {
                        await this.supabase.updateUserWhatsAppStatus(userWithPrompt.user.id, 'active');
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
                const text = firstMsg?.message?.message?.conversation ||
                    firstMsg?.message?.conversation ||
                    firstMsg?.message?.text?.body ||
                    firstMsg?.message?.message?.extendedTextMessage?.text ||
                    '';
                const chatsId = chats?.id || '';
                const remoteJid = chatsId || firstMsg?.message?.key?.remoteJid || '';
                const digitsOnly = (remoteJid || '').replace(/\D+/g, '');
                let senderPhone = digitsOnly ? this.normalizePhoneNumber(digitsOnly) : '';
                console.log('Incoming chats.update (parsed):', { text, senderPhone });
                if (!text || !senderPhone || !/^972[0-9]{9}$/.test(senderPhone)) {
                    res.status(200).json({ ok: true });
                    return;
                }
                const userWithPrompt = await this.supabase.getUserWithSystemPromptByPhone(senderPhone);
                const systemPrompt = userWithPrompt?.systemPrompt?.prompt;
                const aiResponse = await this.aiService.generateResponse([{ role: 'user', content: text }], systemPrompt ? { systemPrompt } : undefined);
                const replyText = aiResponse?.content?.trim();
                if (replyText && replyText.length > 0) {
                    await wasender_service_js_1.wasenderService.sendMessage(senderPhone, replyText);
                    if (userWithPrompt?.user?.id) {
                        await this.supabase.updateUserWhatsAppStatus(userWithPrompt.user.id, 'active');
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
            let messageText = text;
            if (!messageText) {
                const userByPhone = await this.supabase.getUserByPhone(phoneNumber);
                const displayName = (userByPhone?.name || userName || '').trim();
                const businessName = (userByPhone?.business_name || userBusinessName || '').trim();
                const helloPart = displayName ? `היי ${displayName}` : 'היי';
                const businessPart = businessName ? ` מ${businessName}` : '';
                messageText = `${helloPart} אני דנה${businessPart} 😊מתחילים שיחת הדמייה`;
            }
            const wasenderResponse = await wasender_service_js_1.wasenderService.sendMessage(phoneNumber, messageText);
            if (!wasenderResponse.success) {
                res.status(502).json({ success: false, error: 'Failed to send via Wasender', details: wasenderResponse.error });
                return;
            }
            const user = await this.supabase.getUserByPhone(phoneNumber);
            if (user) {
                await this.supabase.updateUserWhatsAppStatus(user.id, 'sent');
            }
            res.json({ success: true, message: 'First message sent successfully', wasenderResponse });
        }
        catch (error) {
            console.error('Error in sendFirstMessage:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }
}
exports.WhatsAppController = WhatsAppController;
//# sourceMappingURL=whatsapp.controller.js.map