import OpenAI from 'openai';
import { config } from '../config/env';
import { AIResponse, AIConfig, Message } from '../types/index';
import { SupabaseService } from './supabase.service';

export class AIService {
  private openai: OpenAI;
  private defaultConfig: AIConfig;
  private supabaseService: SupabaseService;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
    this.supabaseService = new SupabaseService();
    
    this.defaultConfig = {
      model: config.openai.model,
      temperature: 0.3,
      maxTokens: 1000,
      systemPrompt: 'אתה סוכנת AI חכמה ומועילה. ענה בעברית בצורה ברורה וידידותית. - תשמרי על זרימה טבעית, בלי לחזור על עצמך.\n' +
          '- אם הלקוח קצר – תעני בקצרה. אם מפורט – תתאימי את עצמך.\n' +
          '- אם כבר יש פרטים עליו, תשתמשי בהם.\n' +
          '- אם הוא מתנגד – תתייחסי בעדינות ואל תילחצי למכור.\n' +
          '- תמיד תשמרי על שפה אנושית, קלילה ומזמינה.\n' +
          '- לשאול רק שאלה אחת בכל הודעה \n' +
          '- לענות עד 200 תווים כולל רווחים\n' +
          '- אין לחרוג מהגבלה זו בשום מקרה\n' +
          '- אם התגובה ארוכה מדי, קיצר אותה\n' +
          '- תמיד ספור את התווים לפני השליחה\n' +
          '- השתמש בנקודות עצירה טבעיות (נקודה, סימן שאלה)\n' +
          '- הימנע ממשפטים ארוכים מדי'
    };
  }

  async transcribeWav(filePath: string): Promise<string> {
    try {
      const file = await (await import('fs')).promises.readFile(filePath);
      const response = await this.openai.audio.transcriptions.create({
        file: new File([file], 'audio.wav', { type: 'audio/wav' }) as any,
        model: 'whisper-1',
        language: 'he',
        response_format: 'text',
      } as any);
      // Some SDKs return string directly when response_format=text
      return typeof response === 'string' ? response : (response as any).text || '';
    } catch (e) {
      console.error('Transcription failed:', e);
      throw new Error('Failed to transcribe audio');
    }
  }

  async generateResponse(
    messages: Message[],
    customConfig?: Partial<AIConfig>,
    isForWhatsApp: boolean = false
  ): Promise<AIResponse> {
    try {
      const aiConfig = { ...this.defaultConfig, ...customConfig };
      
      // Resolve system prompt: prefer custom; otherwise internal fallback
      let systemPromptToUse = (aiConfig.systemPrompt && typeof aiConfig.systemPrompt === 'string' && aiConfig.systemPrompt.trim().length > 0)
        ? aiConfig.systemPrompt.trim()
        : '';

      if (!systemPromptToUse) {
        systemPromptToUse = this.defaultConfig.systemPrompt;
      }

      // Load global guardrails and prepend to system prompt
      let guardrails = '';
      try {
        // Lazy import to avoid bundler path issues
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const fs = require('fs');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const path = require('path');
        const filePath = path.resolve(__dirname, '..', 'assets', 'global-guardrails.txt');
        if (fs.existsSync(filePath)) {
          guardrails = fs.readFileSync(filePath, 'utf8');
        }
      } catch {}

      // Add behavioral guidelines directly in code
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

      // Convert messages to OpenAI format and inject combined system prompt
      const openaiMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];
      openaiMessages.push({ role: 'system', content: combinedSystem });

      openaiMessages.push(
        ...messages.map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content
        }))
      );

      // הוספת הגבלת תווים ל-system prompt רק עבור WhatsApp
      if (isForWhatsApp) {
        const systemPromptWithLimits = `${combinedSystem}

**חוקים חשובים לתגובה:**
- התגובה חייבת להיות קצרה ומדויקת
- מקסימום 200 תווים כולל רווחים
- אין לחרוג מהגבלה זו בשום מקרה
- אם התגובה ארוכה מדי, קיצר אותה
- תמיד ספור את התווים לפני השליחה`;

        // עדכון ה-system message עם הגבלות
        openaiMessages[0].content = systemPromptWithLimits;
      }

      // Add thinking delay for smarter responses
      await new Promise(resolve => setTimeout(resolve, 4000));

      const completion = await this.openai.chat.completions.create({
        model: aiConfig.model,
        messages: openaiMessages,
        temperature: aiConfig.temperature,
        max_tokens: aiConfig.maxTokens,
      });

      const response = completion.choices[0]?.message?.content || '';
      const usage = completion.usage;
      
      // בדיקה נוספת של אורך התגובה רק עבור WhatsApp
      const validatedResponse = isForWhatsApp ? this.validateResponseLength(response) : response;

      return {
        content: validatedResponse,
        usage: usage ? {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens
        } : undefined
      };
    } catch (error) {
      console.error('Error generating AI response:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  /**
   * בדיקה ותיקון אורך התגובה
   */
  private validateResponseLength(response: string): string {
    const maxLength = 200;
    
    if (response.length <= maxLength) {
      return response;
    }

    // קיצור התגובה
    let shortenedResponse = response.substring(0, maxLength - 3) + '...';
    
    // נסה למצוא נקודת עצירה טבעית
    const lastSpace = shortenedResponse.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.8) { // אם יש רווח קרוב לסוף
      shortenedResponse = response.substring(0, lastSpace) + '...';
    }

    console.warn(`⚠️ Response truncated from ${response.length} to ${shortenedResponse.length} characters`);
    return shortenedResponse;
  }

  async generateSystemPrompt(prompt: string): Promise<string> {
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
    } catch (error) {
      console.error('Error generating system prompt:', error);
      throw new Error('Failed to generate system prompt');
    }
  }
}


