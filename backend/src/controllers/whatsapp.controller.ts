import { Request, Response } from 'express';
import { wasenderService } from '../services/wasender.service';
import { SupabaseService } from '../services/supabase.service';
import { AIService } from '../services/ai.service';
import { mediaService } from '../services/media.service';
import { ConversationService } from '../services/conversation.service';

export class WhatsAppController {
  private supabase = new SupabaseService();
  private aiService = new AIService();
  private conversationService = new ConversationService();
  
  // Store conversation IDs per phone number
  private conversationIds = new Map<string, string>();
  
  // Deduplication: store processed message IDs (with TTL cleanup)
  private processedMessageIds = new Map<string, number>(); // messageId -> timestamp
  private readonly MESSAGE_ID_TTL = 60000; // 1 minute
  
  // Debouncing mechanism for message collection
  private messageBuffers = new Map<string, {
    messages: Array<{
      text: string;
      userName?: string;
      timestamp?: number;
      audioUrl?: string;
      imageUrl?: string;
      audioMediaKey?: string;
      imageMediaKey?: string;
    }>;
    timer?: NodeJS.Timeout;
    isProcessing?: boolean;
    lastMessageTime?: number;
  }>();
  
  private readonly DEBOUNCE_DELAY = 10000; // 10 seconds

  // Check if message was already processed (deduplication)
  private isMessageProcessed(messageId: string): boolean {
    const now = Date.now();
    
    // Clean up old entries
    for (const [id, timestamp] of this.processedMessageIds.entries()) {
      if (now - timestamp > this.MESSAGE_ID_TTL) {
        this.processedMessageIds.delete(id);
      }
    }
    
    // Check if this message was already processed
    if (this.processedMessageIds.has(messageId)) {
      return true;
    }
    
    // Mark as processed
    this.processedMessageIds.set(messageId, now);
    return false;
  }

  private async processMessageWithDebounce(
    senderPhone: string, 
    text: string, 
    userName?: string,
    timestamp?: number,
    audioUrl?: string,
    imageUrl?: string,
    audioMediaKey?: string,
    imageMediaKey?: string
  ): Promise<void> {
    // Get or create buffer for this sender
    let buffer = this.messageBuffers.get(senderPhone);
    if (!buffer) {
      buffer = { 
        messages: [],
        isProcessing: false,
        lastMessageTime: Date.now()
      };
      this.messageBuffers.set(senderPhone, buffer);
    }

    // Add message to buffer
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

    // Clear existing timer
    if (buffer.timer) {
      clearTimeout(buffer.timer);
    }

    // Set new timer
    buffer.timer = setTimeout(async () => {
      if (buffer.isProcessing) {
        console.log(`⏳ Already processing messages for ${senderPhone}, skipping`);
        return;
      }

      buffer.isProcessing = true;

      try {
        // Process all collected messages
        const bufferedMessages = [...buffer.messages];
        buffer.messages = [];
        this.messageBuffers.delete(senderPhone);

        console.log(`🔄 Processing ${bufferedMessages.length} buffered messages for ${senderPhone}`);

        // Add special guidance for multiple messages
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

        // Use data from the latest message for metadata
        const latest = bufferedMessages[bufferedMessages.length - 1];

        // Load system prompt for this user
        const userWithPrompt = await this.supabase.getUserWithSystemPromptByPhone(senderPhone);
        
        // Check if simulation is stopped
        if (userWithPrompt?.user?.whatsapp_status === 'stopped') {
          console.log(`Simulation stopped for ${senderPhone}, skipping response`);
          return;
        }
        
        const systemPrompt = userWithPrompt?.systemPrompt?.prompt;

        // Get or create conversation ID for this phone number
        let conversationId = this.conversationIds.get(senderPhone);
        
        // Call AI to generate reply using conversation service (with history)
        const conversationResponse = await this.conversationService.sendMessage({
          message: combinedText,
          userPhone: senderPhone,
          conversationId: conversationId,
          systemPrompt: systemPrompt,
          customerGender: userWithPrompt?.user?.customer_gender || undefined
        });

        // Store the conversation ID for future messages
        if (conversationResponse?.conversationId) {
          this.conversationIds.set(senderPhone, conversationResponse.conversationId);
        }

        const replyText = conversationResponse?.message?.content?.trim();
        if (replyText && replyText.length > 0) {
          await wasenderService.sendMessage(senderPhone, replyText);
          if (userWithPrompt?.user?.id) {
            await this.supabase.updateUserWhatsAppStatus(userWithPrompt.user.id, 'active');
          }
        }
      } catch (error) {
        console.error('❌ Error processing buffered messages:', { senderPhone, error });
      } finally {
        buffer.isProcessing = false;
      }
    }, this.DEBOUNCE_DELAY);
  }

  private getImageExtension(mimetype: string): string {
    if (mimetype.includes('jpeg') || mimetype.includes('jpg')) return '.jpg';
    if (mimetype.includes('png')) return '.png';
    if (mimetype.includes('gif')) return '.gif';
    if (mimetype.includes('webp')) return '.webp';
    return '.jpg'; // default
  }

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
        
        // Extract message ID for deduplication
        const messageId = message?.key?.id || message?.id || '';
        
        // Skip if already processed (deduplication)
        if (messageId && this.isMessageProcessed(messageId)) {
          console.log(`⏭️  Skipping duplicate message: ${messageId}`);
          res.status(200).json({ ok: true });
          return;
        }
        
        if (message?.key?.fromMe) {
          console.log('Skipping message sent by bot (fromMe=true)');
          res.status(200).json({ ok: true });
          return;
        }

        // Extract text from different possible shapes
        let text: string =
          message?.message?.conversation ||
          message?.conversation ||
          message?.text?.body ||
          message?.message?.extendedTextMessage?.text ||
          '';

        // Extract metadata
        const pushName = message?.pushName || message?.message?.pushName || '';
        const messageTimestamp = message?.messageTimestamp || message?.timestamp || Date.now();

        // Try extract audio and image if no text
        let audioUrl: string | undefined;
        let audioMime: string | undefined;
        let audioMediaKey: string | undefined;
        let imageUrl: string | undefined;
        let imageMime: string | undefined;
        let imageMediaKey: string | undefined;
        
        if (!text) {
          const mm = (message?.message as any) || {};
          
          // Extract audio
          const audio = mm.audioMessage || mm.audio || mm.ptt || mm.voice || mm.message?.audioMessage;
          if (audio) {
            audioUrl = audio.directPath || audio.url || audio.mediaUrl || audio.downloadUrl;
            audioMime = audio.mimetype || audio.mimeType;
            audioMediaKey = audio.mediaKey;
          }
          
          // Extract image
          const image = mm.imageMessage || mm.image || mm.message?.imageMessage;
          if (image) {
            imageUrl = image.directPath || image.url || image.mediaUrl || image.downloadUrl;
            imageMime = image.mimetype || image.mimeType;
            imageMediaKey = image.mediaKey;
          }
          
          // Some providers put media at top-level
          if (!audioUrl && !imageUrl && (message as any)?.mediaUrl) {
            audioUrl = (message as any).mediaUrl;
          }
        }

        // Extract sender phone from remoteJid (e.g., "9725XXXXXXXX@s.whatsapp.net")
        const remoteJid: string = message?.key?.remoteJid || message?.from || '';
        const digitsOnly = (remoteJid || '').replace(/\D+/g, '');
        let senderPhone = digitsOnly;
        if (senderPhone) {
          // Ensure normalized to 972 format
          senderPhone = this.normalizePhoneNumber(senderPhone);
        }

        console.log('Incoming message (parsed):', { text, senderPhone, hasAudio: !!audioUrl, hasImage: !!imageUrl });

        if (!senderPhone || !/^972[0-9]{9}$/.test(senderPhone)) {
          console.warn('Webhook missing valid sender phone');
          res.status(200).json({ ok: true });
          return;
        }

        if (text) {
          // Process text with debouncing (collects multiple messages over 5 seconds)
          await this.processMessageWithDebounce(senderPhone, text, pushName, messageTimestamp);
        } else if (audioUrl) {
          // Download, convert and transcribe
          try {
            console.log('Processing audio:', { audioUrl, audioMediaKey, audioMime });
            let inputPath: string;
            
            if (audioMediaKey) {
              // Use decryption for encrypted files
              inputPath = await mediaService.downloadAndDecryptAudio(audioUrl, audioMediaKey, audioMime || 'audio/ogg');
            } else {
              // Use direct download for unencrypted files
              inputPath = await mediaService.downloadToTemp(audioUrl, '.ogg');
            }
            
            const wavPath = await mediaService.convertToWav16kMono(inputPath);
            const transcript = await this.aiService.transcribeWav(wavPath);
            console.log('Transcribed text:', transcript);
            await this.processMessageWithDebounce(senderPhone, transcript, pushName, messageTimestamp, audioUrl, undefined, audioMediaKey);
            await mediaService.cleanupTemp(wavPath);
          } catch (e) {
            console.error('Audio handling failed:', e);
            // Send fallback message
            await this.processMessageWithDebounce(senderPhone, 'לא הצלחתי להבין את ההקלטה, אפשר לנסח בטקסט?');
          }
        } else if (imageUrl) {
          // Download and analyze image
          try {
            console.log('Processing image:', { imageUrl, imageMediaKey, imageMime });
            let inputPath: string;
            
            if (imageMediaKey) {
              // Use decryption for encrypted files
              inputPath = await mediaService.downloadAndDecryptImage(imageUrl, imageMediaKey, imageMime || 'image/jpeg');
            } else {
              // Use direct download for unencrypted files
              const extension = this.getImageExtension(imageMime || 'image/jpeg');
              inputPath = await mediaService.downloadToTemp(imageUrl, extension);
            }
            
            // Analyze image with GPT-4 Vision
            const { ImageAnalysisService } = await import('../services/image-analysis.service');
            const imageAnalysisService = new ImageAnalysisService();
            
            const imageAnalysis = await imageAnalysisService.analyzeImage(inputPath);
            const businessAnalysis = await imageAnalysisService.analyzeImageForBusiness(inputPath, 'שירותי שיווק בפייסבוק, ניהול קמפיינים, יצירת תוכן');
            
            const combinedAnalysis = `המשתמש שלח תמונה. ניתוח התמונה: ${imageAnalysis}\n\nהקשר עסקי: ${businessAnalysis}`;
            console.log('Image analysis:', combinedAnalysis);
            await this.processMessageWithDebounce(senderPhone, combinedAnalysis, pushName, messageTimestamp, undefined, imageUrl, undefined, imageMediaKey);
            await mediaService.cleanupTemp(inputPath);
          } catch (e) {
            console.error('Image handling failed:', e);
            // Send fallback message
            await this.processMessageWithDebounce(senderPhone, 'לא הצלחתי לנתח את התמונה, אפשר לנסות שוב או לכתוב לי בטקסט?');
          }
        }
      }

      // Handle chats.update events (some providers deliver text here)
      if (event === 'chats.update' && data?.chats) {
        const chats = data.chats;
        const firstMsg = Array.isArray(chats?.messages) ? chats.messages[0] : chats?.messages?.[0];
        
        // Extract message ID for deduplication
        const messageId = firstMsg?.message?.key?.id || firstMsg?.message?.id || '';
        
        // Skip if already processed (deduplication)
        if (messageId && this.isMessageProcessed(messageId)) {
          console.log(`⏭️  Skipping duplicate message (chats.update): ${messageId}`);
          res.status(200).json({ ok: true });
          return;
        }
        
        const fromMe = firstMsg?.message?.key?.fromMe;
        if (fromMe === true) {
          res.status(200).json({ ok: true });
          return;
        }

        let text: string =
          firstMsg?.message?.message?.conversation ||
          firstMsg?.message?.conversation ||
          firstMsg?.message?.text?.body ||
          firstMsg?.message?.message?.extendedTextMessage?.text ||
          '';

        // Extract metadata for chats.update
        const pushName = firstMsg?.pushName || firstMsg?.message?.pushName || '';
        const messageTimestamp = firstMsg?.messageTimestamp || firstMsg?.timestamp || Date.now();

        // Try extract audio in chats.update as well
        let audioUrl: string | undefined;
        let mediaKey: string | undefined;
        if (!text) {
          const mm = (firstMsg?.message as any) || {};
          const audio = mm.audioMessage || mm.audio || mm.ptt || mm.voice || mm.message?.audioMessage;
          if (audio) {
            // Try directPath first (unencrypted), then url (encrypted)
            audioUrl = audio.directPath || audio.url || audio.mediaUrl || audio.downloadUrl;
            mediaKey = audio.mediaKey;
          }
          if (!audioUrl && (firstMsg as any)?.mediaUrl) {
            audioUrl = (firstMsg as any).mediaUrl;
          }
        }

        const chatsId: string = chats?.id || '';
        const remoteJid: string = chatsId || firstMsg?.message?.key?.remoteJid || '';
        const digitsOnly = (remoteJid || '').replace(/\D+/g, '');
        let senderPhone = digitsOnly ? this.normalizePhoneNumber(digitsOnly) : '';

        console.log('Incoming chats.update (parsed):', { text, senderPhone, hasAudio: !!audioUrl });

        if (!senderPhone || !/^972[0-9]{9}$/.test(senderPhone)) {
          res.status(200).json({ ok: true });
          return;
        }

        if (text) {
          await this.processMessageWithDebounce(senderPhone, text, pushName, messageTimestamp);
        } else if (audioUrl) {
          try {
            console.log('Processing audio (chats.update):', { audioUrl, mediaKey });
            let inputPath: string;
            
            if (mediaKey) {
              // Use decryption for encrypted files
              inputPath = await mediaService.downloadAndDecryptAudio(audioUrl, mediaKey, 'audio/ogg');
            } else {
              // Use direct download for unencrypted files
              inputPath = await mediaService.downloadToTemp(audioUrl, '.ogg');
            }
            
            const wavPath = await mediaService.convertToWav16kMono(inputPath);
            const transcript = await this.aiService.transcribeWav(wavPath);
            console.log('Transcribed text (chats.update):', transcript);
            await this.processMessageWithDebounce(senderPhone, transcript, pushName, messageTimestamp, audioUrl, undefined, mediaKey);
            await mediaService.cleanupTemp(wavPath);
          } catch (e) {
            console.error('Audio handling failed (chats.update):', e);
            // Send fallback message
            await this.processMessageWithDebounce(senderPhone, 'לא הצלחתי להבין את ההקלטה, אפשר לנסח בטקסט?');
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

      // Get existing user
      const existingUser = await this.supabase.getUserByPhone(phoneNumber);
      
      // Allow new simulations! Only block if message was sent very recently (< 1 minute)
      // This allows creating multiple simulations for the same user
      if (existingUser && existingUser.whatsapp_status === 'sent' && existingUser.first_message_sent_at) {
        const timeSinceFirstMessage = Date.now() - new Date(existingUser.first_message_sent_at).getTime();
        
        // If less than 1 minute passed, it's the same simulation
        if (timeSinceFirstMessage < 60000) {
          res.json({ success: true, message: 'First message already sent recently (< 1 min ago)' });
          return;
        }
        
        // More than 1 minute passed - this is a new simulation!
        console.log(`🔄 Starting new simulation for ${phoneNumber} (previous was ${Math.floor(timeSinceFirstMessage/1000)}s ago)`);
        
        // מחיקת השיחה הישנה לפני התחלת החדשה
        const oldConversationId = this.conversationIds.get(phoneNumber);
        if (oldConversationId) {
          await this.conversationService.deleteConversation(oldConversationId);
          this.conversationIds.delete(phoneNumber);
          console.log(`🗑️  Cleared old conversation for new simulation`);
        }
      }

      // Build first message from system prompt and user profile
      const userWithPrompt = await this.supabase.getUserWithSystemPromptByPhone(phoneNumber);
      const systemPrompt = userWithPrompt?.systemPrompt?.prompt || systemPromptText;
      // Always get agent name (default to "נועה" if not found in system prompt)
      const agentName = this.extractAgentName(systemPrompt);
      const customerName = userName || userBusinessName || undefined;

      // Always include "אני [שם סוכנת]" in the message
      let firstMessage = '';
      if (customerName) {
        firstMessage = `היי ${customerName} אני ${agentName} מתחילים שיחת הדמייה`;
      } else {
        firstMessage = `היי אני ${agentName} מתחילים שיחת הדמייה`;
      }

      const wasenderResponse = await wasenderService.sendMessage(phoneNumber, firstMessage);
      if (!wasenderResponse.success) {
        res.status(502).json({ success: false, error: 'Failed to send via Wasender', details: wasenderResponse.error });
        return;
      }

      // Update user WhatsApp status
      const user = await this.supabase.getUserByPhone(phoneNumber);
      if (user) {
        await this.supabase.updateUserWhatsAppStatus(user.id, 'sent');
      }

      res.json({ success: true, message: 'First message sent successfully via AI' });
    } catch (error) {
      console.error('Error in sendFirstMessage:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  private extractAgentName(systemPrompt?: string): string {
    if (!systemPrompt) return 'נועה';
    const lines = systemPrompt.split('\n').map(l => l.trim()).filter(Boolean);
    const text = lines.join(' ');
    const patterns: RegExp[] = [
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
    // Default to "נועה" if no agent name found in system prompt
    return 'נועה';
  }

  async stopSimulation(req: Request, res: Response): Promise<void> {
    try {
      const { userPhone } = req.body;

      if (!userPhone) {
        res.status(400).json({ success: false, error: 'User phone number is required' });
        return;
      }

      // Normalize phone number
      const normalizedPhone = this.normalizePhoneNumber(userPhone);
      if (!/^972[0-9]{9}$/.test(normalizedPhone)) {
        res.status(400).json({ success: false, error: 'Invalid phone number format' });
        return;
      }

      // Update user status to 'stopped'
      const user = await this.supabase.getUserByPhone(normalizedPhone);
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      await this.supabase.updateUserWhatsAppStatus(user.id, 'stopped');
      
      // מחיקת היסטוריית השיחה מהזיכרון
      const conversationId = this.conversationIds.get(normalizedPhone);
      if (conversationId) {
        await this.conversationService.deleteConversation(conversationId);
        this.conversationIds.delete(normalizedPhone);
        console.log(`🗑️  Deleted conversation history for ${normalizedPhone}`);
      }

      res.json({ success: true, message: 'Simulation stopped and conversation cleared successfully' });
    } catch (error) {
      console.error('Error in stopSimulation:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}
