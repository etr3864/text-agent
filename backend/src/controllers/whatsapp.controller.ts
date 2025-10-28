import { Request, Response } from 'express';
import { wasenderService } from '../services/wasender.service.js';
import { SupabaseService } from '../services/supabase.service.js';

export class WhatsAppController {
  private supabase = new SupabaseService();

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

      if (event === 'messages.upsert' && data?.messages) {
        const msg = data.messages;
        const message = Array.isArray(msg) ? msg[0] : msg;
        if (message?.key?.fromMe) {
          console.log('Skipping message sent by bot (fromMe=true)');
          res.status(200).json({ ok: true });
          return;
        }
        console.log('Incoming message:', message?.message || message?.text || message);
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

      // Build a friendly opening message from system prompt (if available)
      let messageText = text;
      if (!messageText) {
        const snippet = (systemPromptText || '').replace(/\s+/g, ' ').slice(0, 80).trim();
        const namePart = userName ? ` היי ${userName}!` : ' היי!';
        if (snippet.length > 0) {
          messageText = `${namePart} אני הסוכנת שלך. ${snippet}... איך אפשר לעזור היום?`;
        } else {
          messageText = `${namePart} אני הסוכנת שלך. איך אפשר לעזור היום?`;
        }
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
