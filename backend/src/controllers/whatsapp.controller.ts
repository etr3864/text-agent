import { Request, Response } from 'express';
import { wasenderService } from '../services/wasender.service.js';
import { SupabaseService } from '../services/supabase.service.js';
import { AIService } from '../services/ai.service.js';

export class WhatsAppController {
  private supabase = new SupabaseService();
  private aiService = new AIService();

  private normalizePhoneNumber(input: string): string {
    // Keep digits only
    let digits = (input || '').replace(/\D+/g, '');
    // Convert leading 00 to +
    if (digits.startsWith('00')) {
      digits = digits.slice(2);
    }
    // Ensure Israel country code 972
    if (digits.startsWith('972')) {
      return digits;
    }
    // If starts with single leading 0 (local), drop it and prefix 972
    if (digits.startsWith('0')) {
      return '972' + digits.slice(1);
    }
    // If already without leading 0 and 9-10 digits, prefix 972
    if (!digits.startsWith('972')) {
      return '972' + digits;
    }
    return digits;
  }

  async webhook(req: Request, res: Response): Promise<void> {
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

        // Extract text from different possible shapes
        const text: string =
          message?.message?.conversation ||
          message?.conversation ||
          message?.text?.body ||
          message?.message?.extendedTextMessage?.text ||
          '';

        // Extract sender phone from remoteJid (e.g., "9725XXXXXXXX@s.whatsapp.net")
        const remoteJid: string = message?.key?.remoteJid || message?.from || '';
        const digitsOnly = (remoteJid || '').replace(/\D+/g, '');
        let senderPhone = digitsOnly;
        if (senderPhone) {
          // Ensure normalized to 972 format
          senderPhone = this.normalizePhoneNumber(senderPhone);
        }

        console.log('Incoming message (parsed):', { text, senderPhone });

        if (!text || !senderPhone || !/^972[0-9]{9}$/.test(senderPhone)) {
          console.warn('Webhook message missing text or valid sender phone');
          res.status(200).json({ ok: true });
          return;
        }

        // Load system prompt for this user (fallback to default inside service)
        const userWithPrompt = await this.supabase.getUserWithSystemPromptByPhone(senderPhone);
        const systemPrompt = userWithPrompt?.systemPrompt?.prompt;

        // Call AI to generate reply
        const aiResponse = await this.aiService.generateResponse(
          [ { role: 'user', content: text } as any ],
          systemPrompt ? { systemPrompt } : undefined
        );

        const replyText = aiResponse?.content?.trim();
        if (replyText && replyText.length > 0) {
          await wasenderService.sendMessage(senderPhone, replyText);
          if (userWithPrompt?.user?.id) {
            await this.supabase.updateUserWhatsAppStatus(userWithPrompt.user.id, 'active');
          }
        }
      }

      // Handle chats.update events (some providers deliver text here)
      if (event === 'chats.update' && data?.chats) {
        const chats = data.chats;
        const firstMsg = Array.isArray(chats?.messages) ? chats.messages[0] : chats?.messages?.[0];
        const fromMe = firstMsg?.message?.key?.fromMe;
        if (fromMe === true) {
          res.status(200).json({ ok: true });
          return;
        }

        const text: string =
          firstMsg?.message?.message?.conversation ||
          firstMsg?.message?.conversation ||
          firstMsg?.message?.text?.body ||
          firstMsg?.message?.message?.extendedTextMessage?.text ||
          '';

        const chatsId: string = chats?.id || '';
        const remoteJid: string = chatsId || firstMsg?.message?.key?.remoteJid || '';
        const digitsOnly = (remoteJid || '').replace(/\D+/g, '');
        let senderPhone = digitsOnly ? this.normalizePhoneNumber(digitsOnly) : '';

        console.log('Incoming chats.update (parsed):', { text, senderPhone });

        if (!text || !senderPhone || !/^972[0-9]{9}$/.test(senderPhone)) {
          res.status(200).json({ ok: true });
          return;
        }

        const userWithPrompt = await this.supabase.getUserWithSystemPromptByPhone(senderPhone);
        const systemPrompt = userWithPrompt?.systemPrompt?.prompt;

        const aiResponse = await this.aiService.generateResponse(
          [ { role: 'user', content: text } as any ],
          systemPrompt ? { systemPrompt } : undefined
        );

        const replyText = aiResponse?.content?.trim();
        if (replyText && replyText.length > 0) {
          await wasenderService.sendMessage(senderPhone, replyText);
          if (userWithPrompt?.user?.id) {
            await this.supabase.updateUserWhatsAppStatus(userWithPrompt.user.id, 'active');
          }
        }
      }

      res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Error in WhatsApp webhook:', error);
      res.status(200).json({ ok: true });
    }
  }

  async sendFirstMessage(req: Request, res: Response): Promise<void> {
    try {
      const { systemPromptId, userPhone, text } = req.body || {};
      
      let phoneNumber = userPhone;
      let userName: string | undefined;
      let userBusinessName: string | undefined;
      let systemPromptText: string | undefined;
      
      // If no phone provided, try to get it from Supabase using systemPromptId
      if (!phoneNumber && systemPromptId) {
        const systemPrompt = await this.supabase.getSystemPrompt(systemPromptId);
        if (systemPrompt) {
          systemPromptText = systemPrompt.prompt;
          // 1) Try find user linked to this system prompt
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

      // Normalize and validate phone number
      phoneNumber = this.normalizePhoneNumber(phoneNumber);
      if (!/^972[0-9]{9}$/.test(phoneNumber)) {
        res.status(400).json({ success: false, error: 'Invalid phone number after normalization' });
        return;
      }

      // Build the opening message
      let messageText = text;
      if (!messageText) {
        // Fetch user by phone (post-normalization) to ensure we have latest name and business_name
        const userByPhone = await this.supabase.getUserByPhone(phoneNumber);
        const displayName = (userByPhone?.name || userName || '').trim();
        const businessName = (userByPhone?.business_name || userBusinessName || '').trim();

        // Format: "היי {שם} אני דנה מ{שם העסק} 😊מתחילים שיחת הדמייה"
        // If name missing, omit it gracefully; if business missing, omit the "מ{...}" part
        const helloPart = displayName ? `היי ${displayName}` : 'היי';
        const businessPart = businessName ? ` מ${businessName}` : '';
        messageText = `${helloPart} אני דנה${businessPart} 😊מתחילים שיחת הדמייה`;
      }
      const wasenderResponse = await wasenderService.sendMessage(phoneNumber, messageText);

      if (!wasenderResponse.success) {
        res.status(502).json({ success: false, error: 'Failed to send via Wasender', details: wasenderResponse.error });
        return;
      }

      // Update user WhatsApp status
      const user = await this.supabase.getUserByPhone(phoneNumber);
      if (user) {
        await this.supabase.updateUserWhatsAppStatus(user.id, 'sent');
      }

      res.json({ success: true, message: 'First message sent successfully', wasenderResponse });
    } catch (error) {
      console.error('Error in sendFirstMessage:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}
