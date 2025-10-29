import { Request, Response } from 'express';
import { ConversationService } from '../services/conversation.service';
import { ChatRequest, ChatResponse } from '../types/index';
import { config } from '../config/env';
import axios from 'axios';
import FormData from 'form-data';
import { AIService } from '../services/ai.service';
// Dynamic import for pdf-parse to handle both CommonJS and ESM
let pdfParse: any = null;
const loadPdfParse = async () => {
  if (!pdfParse) {
    try {
      const mod: any = await import('pdf-parse');
      pdfParse = typeof mod === 'function' ? mod : (typeof mod?.default === 'function' ? mod.default : null);
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const modCjs: any = require('pdf-parse');
      pdfParse = typeof modCjs === 'function' ? modCjs : (typeof modCjs?.default === 'function' ? modCjs.default : null);
    }
  }
  if (typeof pdfParse !== 'function') {
    throw new Error('pdf-parse module did not export a function');
  }
  return pdfParse as (buf: Buffer) => Promise<{ text: string }>;
};

import { SupabaseService } from '../services/supabase.service';

export class ChatController {
  private conversationService: ConversationService;
  private aiService: AIService;
  private supabaseService: SupabaseService;

  constructor() {
    this.conversationService = new ConversationService();
    this.aiService = new AIService();
    this.supabaseService = new SupabaseService();
  }

  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const { message, conversationId, systemPrompt }: ChatRequest = req.body;

      if (!message || typeof message !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Message is required and must be a string'
        });
        return;
      }

      const response: ChatResponse = await this.conversationService.sendMessage({
        message,
        conversationId,
        systemPrompt
      });

      if (response.success) {
        res.json(response);
      } else {
        res.status(500).json(response);
      }
    } catch (error) {
      console.error('Error in sendMessage:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async getConversations(req: Request, res: Response): Promise<void> {
    try {
      const conversations = await this.conversationService.getAllConversations();
      res.json({
        success: true,
        conversations
      });
    } catch (error) {
      console.error('Error getting conversations:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async getConversation(req: Request, res: Response): Promise<void> {
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
    } catch (error) {
      console.error('Error getting conversation:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async createConversation(req: Request, res: Response): Promise<void> {
    try {
      const { title } = req.body;
      const conversation = await this.conversationService.createConversation(title);
      
      res.json({
        success: true,
        conversation
      });
    } catch (error) {
      console.error('Error creating conversation:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async deleteConversation(req: Request, res: Response): Promise<void> {
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
    } catch (error) {
      console.error('Error deleting conversation:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
// ================ OCR.space PDF parsing ================
  async parsePdf(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: 'No PDF file provided' });
        return;
      }

      const uploadedFile = req.file as any;
      const pdfBuffer = uploadedFile.buffer as Buffer;
      const originalName = (uploadedFile.originalname as string) || 'document.pdf';

      // ========== LlamaParse (LlamaIndex Cloud) ==========
      // Using user-provided API key and base URL directly as requested
      const LLAMAINDEX_API_KEY = 'llx-p1rqcgG6HbG31MZU6zpip5BYpF95ckuNtliioEHWP8CZfVeG';
      const LLAMAINDEX_BASE_URL = 'https://api.llamaindex.ai';
      if (LLAMAINDEX_API_KEY && LLAMAINDEX_BASE_URL) {
        try {
          const liForm = new FormData();
          liForm.append('file', pdfBuffer, {
            filename: originalName,
            contentType: 'application/pdf',
          } as any);

          // Note: endpoint path may vary by LlamaParse API version; adjust if needed
          const liUrl = `${LLAMAINDEX_BASE_URL}/api/parsing/upload`;
          const liResp = await axios.post(liUrl, liForm, {
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
          } catch {}

          // v2 flow: upload returns a job; poll until complete
          const jobId = (liResp.data?.id || liResp.data?.job?.id || liResp.data?.job_id || '').toString();
          if (jobId) {
            const pollUrl = `${LLAMAINDEX_BASE_URL}/api/parsing/jobs/${jobId}`;
            const startTs = Date.now();
            let lastState: string | undefined;
            // poll up to ~120s
            while (Date.now() - startTs < 120000) {
              const jr = await axios.get(pollUrl, {
                headers: { Authorization: `Bearer ${LLAMAINDEX_API_KEY}` },
                timeout: 15000,
              });
              const data = jr.data || {};
              try {
                const preview = JSON.stringify(data).slice(0, 2000);
                console.debug(`[LlamaParse] poll state preview: ${preview}`);
              } catch {}
              const state: string = (data.state || data.status || '').toString().toUpperCase();
              lastState = state;
              if (state === 'SUCCESS' || state === 'SUCCEEDED' || state === 'COMPLETED') {
                // Try various shapes for text output
                const candidates: any[] = [
                  data.text,
                  data.output,
                  data.result?.text,
                  data.result?.output,
                  Array.isArray(data.pages) ? data.pages.map((p: any) => p.text).join('\n\n') : undefined,
                  Array.isArray(data.documents) ? data.documents.map((d: any) => d.text || d.content).join('\n\n') : undefined,
                ];
                const joined = candidates
                  .filter((v) => typeof v === 'string' && v.trim().length > 0)
                  .map((v: string) => v.trim());
                const liText = (joined[0] || '').toString().trim();
                if (liText.length > 0) {
                  res.json({ success: true, text: liText, pages: 0 });
                  return;
                }
                break; // completed but no text; fall through to next parsers
              }
              if (state === 'FAILED' || state === 'ERROR' || state === 'CANCELLED') {
                break; // fall through to next parsers
              }
              await new Promise((r) => setTimeout(r, 1500));
            }
            if (lastState && lastState !== 'SUCCESS' && lastState !== 'SUCCEEDED' && lastState !== 'COMPLETED') {
              console.warn(`LlamaParse job ${jobId} ended without success (state=${lastState})`);
            }
          } else {
            // Legacy immediate text (unlikely); try common fields
            const liTextImmediate = (liResp.data?.text || liResp.data?.output || '').toString().trim();
            if (liTextImmediate && liTextImmediate.length > 0) {
              res.json({ success: true, text: liTextImmediate, pages: 0 });
              return;
            }
          }
        } catch (e) {
          console.warn('LlamaParse failed, will try pdf-parse/OCR as fallback');
        }
      }

      // ========== PDF-PARSE (digital text) ==========
      try {
        const pdfParser = await loadPdfParse();
        const parsed = await pdfParser(pdfBuffer);
        const text = (parsed.text || '').trim();
        const numpages = (parsed as any).numpages || 0;

        if (text.length > 0) {
          const hebrewMatches = text.match(/[\u0590-\u05FF]/g) || [];
          const hebrewRatio = hebrewMatches.length / Math.max(text.length, 1);

          if (hebrewRatio >= 0.2) {
            res.json({ success: true, text, pages: numpages });
            return;
          } else {
            console.warn('pdf-parse produced low Hebrew ratio; falling back to OCR');
          }
        }
      } catch (pdfErr) {
        console.warn('pdf-parse failed:', pdfErr instanceof Error ? pdfErr.message : pdfErr);
      }

      // ========== OCR.SPACE (scanned Hebrew PDFs) ==========
      if (!config.ocr?.apiKey) {
        res.json({ success: true, text: '', pages: 0 });
        return;
      }

      const callOcr = async (extraFields: Record<string, string | boolean> = {}) => {
        const formData = new FormData();
        formData.append('file', pdfBuffer, {
          filename: originalName,
          contentType: 'application/pdf',
        } as any);
        formData.append('apikey', config.ocr.apiKey);
        formData.append('OCREngine', '1'); // 1 עובד טוב לרוב ה-PDFים
        formData.append('filetype', 'PDF');
        formData.append('detectOrientation', 'true');
        formData.append('isTable', 'false');
        formData.append('scale', 'true');

        for (const [k, v] of Object.entries(extraFields)) {
          formData.append(k, String(v));
        }

        const response = await axios.post('https://api.ocr.space/parse/image', formData, {
          headers: formData.getHeaders(),
          maxBodyLength: Infinity,
          timeout: 30000,
        });

        return response.data as any;
      };

      let ocrResult: any = null;
      try {

        ocrResult = await callOcr();

        if (ocrResult?.IsErroredOnProcessing && ocrResult?.ErrorMessage) {
          const msg = Array.isArray(ocrResult.ErrorMessage)
              ? ocrResult.ErrorMessage.join(', ')
              : ocrResult.ErrorMessage;
          console.warn('OCR.space error (default):', msg);

          // נסה מנוע שני עם זיהוי אוטומטי
          ocrResult = await callOcr({ OCREngine: '2', language: 'auto' });

          if (ocrResult?.IsErroredOnProcessing && ocrResult?.ErrorMessage) {
            const msg2 = Array.isArray(ocrResult.ErrorMessage)
                ? ocrResult.ErrorMessage.join(', ')
                : ocrResult.ErrorMessage;
            console.warn('OCR.space error (auto):', msg2);

            // אחרון חביב – אנגלית בלבד (לפחות שלא יקרוס)
            ocrResult = await callOcr({ language: 'eng' });
          }
        }
      } catch (ocrErr) {
        console.warn('OCR.space call failed:', ocrErr instanceof Error ? ocrErr.message : ocrErr);
      }

      let fullText = '';
      let pages = 0;

      if (ocrResult?.ParsedResults && Array.isArray(ocrResult.ParsedResults)) {
        fullText = ocrResult.ParsedResults.map((p: any) => p.ParsedText || '').join('\n\n');
        pages = ocrResult.ParsedResults.length;
      }

      res.json({ success: true, text: (fullText || '').trim(), pages });
    } catch (error) {
      console.error('Error parsing PDF:', error);
      res.status(500).json({ success: false, error: 'Failed to parse PDF' });
    }
  }

  // ================ AI endpoints ================
  async generateDynamicQuestions(req: Request, res: Response): Promise<void> {
    try {
      const { businessName, businessField, businessGoal, systemPromptId, systemPromptText } = req.body || {};
      if (!businessName || !businessField || !businessGoal) {
        res.status(400).json({ success: false, error: 'Business name, field, and goal are required' });
        return;
      }

      // Resolve system prompt to guide question generation
      let resolvedSystemPrompt: string | undefined = typeof systemPromptText === 'string' && systemPromptText.trim().length > 0
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

      const prompt = `המטרה שלך היא ליצור לי סיסטם פרומפט לשיחת הדמיה עם סוכן ללקוח.

זה המבנה של הסיסטם פרומפט (זה רק מבנה שממחיש איך זה אמור להיות - לא להתייחס לנתונים עצמם):

========================
🤖 תפקיד הסוכנת
========================
את עמית – סוכנת AI חכמה ומנומסת מטעם העסק פלאפון.
המטרה שלך: לשוחח בצורה טבעית, לגלות באיזה רשת הלקוח מנוי, אם הוא לקוח קיים של פלאפון : לשאול אותו האם הוא מעוניין להוסיף קווים או לשנות מסלולים בלבד

========================
🏢 פרטי העסק
========================
שם העסק: פלאפון
תחום הפעילות: שירות קווי סלולר
מה העסק מציע: שירותי קווי סלולר
קהל יעד: מבוגרים גילאי 18+
אודות העסק: העסק עובד משנת 2014 שנים נותני שירות מהלב באיכות גבוהה ובמקצועיות

=======
נתונים שצריך לגלות בשאלות:
1. כמה קווים אתה מחזיק היום?
2. באיזו רשת אתה מנוי כיום?
3. אתה מעוניין במסלול דור 4 או דור 5?
4. תשאל שאלה שתגלה אם הלקוח קונה לפי מחיר בצורה אינטיליגנטית

במידה והלקוח מעוניין להעביר אותו להקמת הזמנה על ידיד מנהל תיק לקוח

========================
לשאול את כל השאלות אחת אחריה שניה ולא ביחד
========================

========================
💬 סגנון הדמות
========================
🗣️ טון דיבור: קליל / מקצועי
📝 סגנון כתיבה: קצר וברור
🌍 שפה: עברית
❤️ ערכי העסק: אמינות / יחס אישי / איכות

========================
🎯 מטרות השיחה
========================
1. לזהות מה הלקוח מחפש.
2. לתת מידע מדויק וברור.
3. לבנות אמון ועניין.
4. להוביל לפעולה רכה ומותאמת (CTA).

========================
📜 תסריט בסיסי
========================
👋 פתיחה: "היי! אני {שם הסוכנת} מ-{שם העסק} 😊 איך אפשר לעזור לך היום?"

במידה והלקוח מעוניין בעסקה לא להציע פיתרון לפני ששאלת לפחות 3 שאלות כדי להבין את הצורך

💡 הצעת פתרון: "נשמע שזה בדיוק מה שאנחנו עושים! אסביר בקצרה איך זה עובד אצלנו."

📅 קריאה לפעולה: יאללה סגרנו.

========================
🤖 כללי בינה
========================
- תשמרי על זרימה טבעית, בלי לחזור על עצמך.
- אם הלקוח קצר – תעני בקצרה. אם מפורט – תתאימי את עצמך.
- אם כבר יש פרטים עליו, תשתמשי בהם.
- אם הוא מתנגד – תתייחסי בעדינות ואל תילחצי למכור.
- תמיד תשמרי על שפה אנושית, קלילה ומזמינה.
- לשאול רק שאלה אחת בכל הודעה

✅ מטרה סופית: שהשיחה תרגיש אנושית, חכמה ומקדמת - כאילו מדובר בנציגה אמיתית.

---

פרטים שנאספו מהמשתמש:
שם העסק: ${businessName}
תחום העסק: ${businessField}
מטרת הסוכן: ${businessGoal}

שאל אותי 5-8 שאלות כדי לייצר לי סיסטם פרומפט מתאים לעסק חדש.
חובה לשאול שם ומגדר של הסוכן.
חובה לשאול האם יש דברים שחובה שהסוכן יברר לפני שהוא מניע לפעולה ומה המינימום הודעות לפני העלאה לפעולה
אם יש כבר תשובות מהפרטים שנאספו מהמשתמש לא לשאול שאלות שחוזרות על עצמם
שים לב: הפלט יהיה רק שאלות בלבד, ללא הקדמות וסיומות.`;

      const response = await this.aiService.generateResponse(
        [ { role: 'user', content: prompt } as any ],
        { temperature: 0.7, maxTokens: 500, systemPrompt: resolvedSystemPrompt },
        false // isForWhatsApp = false - לא להגביל תווים ליצירת שאלות
      );

      const questions = response.content
        .split('\n')
        .map(q => q.trim())
        .filter(q => q && q.length > 5)
        .slice(0, 8);

      res.json({ success: true, questions });
    } catch (error) {
      console.error('Error generating dynamic questions:', error);
      res.status(500).json({ success: false, error: 'Failed to generate questions' });
    }
  }

  async generateCustomSystemPrompt(req: Request, res: Response): Promise<void> {
    try {
      const { answers, userPhone } = req.body || {};
      if (!answers || !Array.isArray(answers) || answers.length === 0) {
        res.status(400).json({ success: false, error: 'Answers are required' });
        return;
      }

      // Separate user answers and optional PDF context (additive only)
      const pdfPrefix = 'תוכן מקובץ PDF:';
      const userAnswers: string[] = [];
      const pdfChunks: string[] = [];

      for (const a of answers as string[]) {
        if (typeof a === 'string' && a.trim().startsWith(pdfPrefix)) {
          const onlyText = a.replace(pdfPrefix, '').trim();
          if (onlyText) pdfChunks.push(onlyText);
        } else {
          userAnswers.push(a);
        }
      }

      const pdfSection = pdfChunks.length > 0
        ? `\n\nקונטקסט נוסף מה-PDF (תוספת בלבד, לא במקום תשובות המשתמש):\n${pdfChunks.join('\n')}\n\n`
        : '\n';

      // שליפת שם הלקוח מהמסד נתונים
      let customerFullName = '';
      let customerFirstName = '';
      if (userPhone) {
        const user = await this.supabaseService.getUserByPhone(userPhone);
        if (user && user.name) {
          customerFullName = user.name.trim();
          // חילוץ רק השם הפרטי (המילה הראשונה)
          customerFirstName = customerFullName.split(' ')[0].trim();
        }
      }

      const customerNameSection = customerFullName 
        ? `\n\n📌 שם הלקוח שאיתו את מדברת: ${customerFullName}\n⚠️ חשוב: תשתמשי רק בשם הפרטי "${customerFirstName}" בשיחה, לא בשם המשפחה!\n`
        : '\n';

      const prompt = `אתה מומחה ביצירת סיסטם פרומפטים לסוכני צ׳אט AI.

🎯 מטרת הסיסטם פרומפט:
להגדיר את האישיות, סגנון השיחה וההתנהגות של סוכן צ׳אט (לא סוכן קולי), כך שכל השיחות יהיו טבעיות, אנושיות ומקדמות פעולה.

📋 תשובות המשתמש מהשאלון:
${userAnswers.join('\n')}
${pdfSection}${customerNameSection}
חשוב מאוד:
- התוכן מה-PDF הוא תוספת בלבד. אם קיים פער מול תשובות המשתמש, עדיפות מוחלטת לתשובות המשתמש.
- אם קיימים תסריטי שיחה ב-PDF - חובה לשלב אותם בסעיף "תסריט בסיסי".

⚙️ מבנה הפרומפט הנדרש:

הפרומפט צריך להיכתב ** בפורמט הבא** (כולל הכותרות):

בס״ד

========================
🤖 תפקיד הסוכן
========================
 לשנות לפי בחירת הלקוח ![תיאור קצר של מי הסוכן ומה מטרת השיחה. לדוגמה: "את עמית – סוכנת AI חכמה ומנומסת מטעם העסק ___. המטרה שלך: לגלות את הצורך של הלקוח ולכוון אותו לפעולה מתאימה."]

========================
🏢 פרטי העסק
========================
שם העסק: [שם העסק מהתשובות]
תחום הפעילות: [תחום מהתשובות]
מה העסק מציע: [מה שהעסק מציע]
קהל יעד: [קהל היעד]
אודות העסק: [תיאור קצר של העסק - שנת הקמה, ערכים, וכו׳]

========================
👤 שם הלקוח
========================
${customerFullName ? `שם מלא: ${customerFullName}
שם פרטי: ${customerFirstName}

⚠️ חשוב: 
- תשתמשי בשיחה **רק** בשם הפרטי "${customerFirstName}" - אסור להשתמש בשם המשפחה!
- השתמשי בשם רק כשזה מתאים ומקרב (לא בכל הודעה)
- בהודעת הפתיחה הראשונה אפשר להשתמש בו` : 'שם הלקוח לא סופק. אל תשתמשי בשם ספציפי.'}

========================
💬 שאלות חובה במהלך השיחה
========================
[רשימת 3–6 שאלות שהסוכן חייב לשאול לפי סדר, כדי להבין את הצורך]
1. [שאלה ראשונה]
2. [שאלה שנייה]
3. [שאלה שלישית]
...

❗ חשוב: לשאול רק שאלה אחת בכל הודעה ולא יותר.

========================
💬 סגנון הדמות
========================
🗣️ טון דיבור: [קליל / מקצועי / חמים / וכו׳]
📝 סגנון כתיבה: קצר וברור
🌍 שפה: עברית
❤️ ערכי העסק: [לדוגמה: אמינות / יחס אישי / מקצועיות]

========================
🎯 מטרות השיחה
========================
1. לזהות את הצורך של הלקוח
2. לתת מידע מדויק וברור
3. לבנות אמון ועניין
4. להוביל לפעולה [לדוגמה: קביעת פגישה / שליחת פרטים / העברה למנהל תיק]

========================
📜 תסריט בסיסי
========================
פתיחה: "[דוגמה לפתיחת שיחה]" - להסביר שהפתיחה צריכה להסתיים בשאלה שתעניין את הלקוח בשיחה ותתעניין בו ותבין עליו דברים רלוונטיים

הצעת פתרון: "[איך להציע פתרון אחרי הבנת הצורך]"

 קריאה לפעולה: "[דוגמה ל-CTA]"

להסביר שלא חייב להשתמש בדיוק בתסריט פה אלא זה רק דוגמאות ומבנה השיחה

[אם יש תסריטי שיחה מה-PDF - שלב אותם כאן בפורמט ברור]

========================
🤖 כללי בינה והתנהגות
========================
❗ לשאול שאלה אחת בלבד בכל הודעה

❗ לא לשאול כמה שאלות באותה הודעה

❗ לא להשתמש בסימני קריאה באמצע משפט

❗ להציג את עצמך רק בהודעה הראשונה ולהשתמש בשם הצקוח בהצגה העצמית רק בהודעת פתיחה הראשונה 

❗ להשתמש בשם הלקוח רק במידה ואת צריכה מקרב איתו במהלך השיחה 

❗ כל הודעה צריכה להיות עד 200 תווים לכל היותר

❗ תשתמשי בשם הלקוח ותגידי לו היי רק בהודעה בהראושנה (אפשר להשתמש בשם שלו רק במידה וצריך קרב באמצע השיחה ) לאחר מכן אל תגידי לו היי או שלום אלא תמשיכי לדבר כרגיל

❗ להשתדל לא להשתמש באותם ביטויים כל הזמן ולהיות דינמי ואנושי

❗ לא לשאול שאלות שהלקוח כבר ענה עליהם את התשובה במהלך השיחה



✅ לשמור על שפה פשוטה, ברורה ואנושית

✅ אם הלקוח מגיב בקצרה – לענות בקצרה. אם מפרט – להתאים את עצמך

✅ לא לחזור על דברים שכבר נאמרו

✅ לא למכור בכוח – לבנות אמון בהדרגה

✅ אם קיימים קבצי תסריטי שיחה מצורפים, הסוכן חייב להתחשב בהם ולשלב את הסגנון והמידע מהם בשיחה

✅ לא להשתמש באימוג׳ים באמצע משפט, רק בתחילת הודעה במידת הצורך

✅ לשמור על זרימה טבעית ולא רובוטית

✅ תמיד להסתיים בשאלה או קריאה רכה לפעולה

✅ אם הלקוח מבקש בקשות לא רלוונטיות או שואל שאלות לא קשורות לשיחה או לנושא העסק שאת מייצגת תחזירי אותו לשיחה ותגידי לו שבשביל דברים כאלה יש את chat gpt וחבריו ושאת פה לעזור לו ב (בתחום שהעסק שאת מייצגת) 

✅ תמיד להניע את השיחה באמצעות שאלות עומק מעניינות ולסיים בשאלה את ההודעה - להעביר את הכדור למשתמש 

✅ במידה ושואלים אם את בוט או בינה מלאכותית תעני בצורה שמראה שאת בטוחה בעצמך ותשתמשי בהומור כדי להקליל, משהו בסגנו

✅  אסור להשתמש בסמיילים ואימוגים, רק במצב מיוחד מאוד שהסמיילי רלוונטי אבל כשגרה לא להשתמש 
[אם יש כללים נוספים שהמשתמש ציין בתשובות - הוסף אותם כאן, אבל אל תגרע מהכללים הקיימים]

========================
✅ מטרה סופית
========================
שהשיחה תרגיש כמו שיחה עם נציג אנושי אמיתי – לא רובוט, אלא יועץ שירותי וחכם שמקשיב, מבין ומקדם.

---

💡 דגשים חשובים:
- שמור על הפורמט בדיוק לפי הסדר לעיל
- נסח הכל בעברית ברורה ואנושית
- הימנע מסימני פיסוק מוגזמים (!!!, ??? וכו׳)
- כל משפט צריך להרגיש כאילו נכתב ע״י נציג אמיתי
- השתמש בכל המידע מהתשובות (שם לקוח, שם עסק, פרטים מהשאלון, וכל מה שרלוונטי)
- אם יש מידע ב-PDF - שלב אותו בצורה חכמה במקומות הרלוונטיים

ענה רק עם הסיסטם פרומפט המלא בפורמט המדויק, ללא הסבר נוסף.`;

      const response = await this.aiService.generateResponse(
        [ { role: 'user', content: prompt } as any ],
        { temperature: 0.7, maxTokens: 12000 },
        false // isForWhatsApp = false - לא להגביל תווים ליצירת סיסטם פרומפט
      );

      const generatedPrompt = response.content;

      // Save to Supabase system_prompts
      const created = await this.supabaseService.createCustomSystemPrompt(generatedPrompt, userPhone);

      // Link to user if possible
      if (created && userPhone) {
        const user = await this.supabaseService.getUserByPhone(userPhone);
        if (user) {
          await this.supabaseService.updateUserSystemPrompt(user.id, created.id);
          // איפוס סטטוס ההדמיה כדי לאפשר התחלה מחדש
          await this.supabaseService.resetUserSimulationStatus(user.id);
          console.log(`✅ Reset simulation status for user ${userPhone} - ready for new simulation`);
        }
      }

      res.json({ 
        success: true, 
        systemPrompt: { 
          prompt: generatedPrompt, 
          id: created ? created.id : null 
        } 
      });
    } catch (error) {
      console.error('Error generating custom system prompt:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  async updateUserBusinessName(req: Request, res: Response): Promise<void> {
    try {
      const { phone, userPhone, businessName } = req.body || {};
      const phoneNumber = phone || userPhone;
      if (!phoneNumber || !businessName) {
        res.status(400).json({ success: false, error: 'Phone and business name are required' });
        return;
      }

      // Placeholder for real DB update
      res.json({ success: true, message: 'Business name updated successfully' });
    } catch (error) {
      console.error('Error updating business name:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  async updateSystemPrompt(req: Request, res: Response): Promise<void> {
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
    } catch (error) {
      console.error('Error updating system prompt:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}


