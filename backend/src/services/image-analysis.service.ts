import { OpenAI } from 'openai';
import fs from 'fs/promises';
import path from 'path';
import { toFile } from 'openai/uploads';

export class ImageAnalysisService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY! 
    });
  }

  /**
   * ניתוח תמונה וזיהוי תוכן
   */
  async analyzeImage(imageFilePath: string): Promise<string> {
    try {
      console.log(`🖼️ Analyzing image: ${path.basename(imageFilePath)}`);

      // בדיקה אם הקובץ קיים
      await fs.access(imageFilePath);
      console.log(`✅ Image file exists and is accessible`);

      // קריאת התמונה
      const imageBuffer = await fs.readFile(imageFilePath);
      console.log(`✅ Image file read: ${imageBuffer.length} bytes`);

      // יצירת File object
      const imageFile = await toFile(imageBuffer, path.basename(imageFilePath), {
        type: 'image/jpeg', // או 'image/png' בהתאם לפורמט
      });

      // שליחה ל-GPT-4 Vision
      console.log(`🤖 Calling OpenAI GPT-4 Vision API...`);
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `תאר את התמונה הזו בעברית. מה אתה רואה? תן תיאור מפורט של התוכן, הצבעים, העצמים, הטקסט (אם יש), והמשמעות הכללית.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBuffer.toString('base64')}`
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      const analysis = response.choices[0]?.message?.content || '';
      
      if (!analysis || analysis.trim().length === 0) {
        throw new Error('Empty analysis response');
      }

      console.log(`✅ Image analysis complete: "${analysis.substring(0, 50)}..."`);
      return analysis.trim();
    } catch (error: any) {
      console.error('❌ Failed to analyze image:', {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
        stack: error?.stack
      });
      throw new Error(`Image analysis failed: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * זיהוי טקסט בתמונה (OCR)
   */
  async extractTextFromImage(imageFilePath: string): Promise<string> {
    try {
      console.log(`📝 Extracting text from image: ${path.basename(imageFilePath)}`);

      const imageBuffer = await fs.readFile(imageFilePath);
      const imageFile = await toFile(imageBuffer, path.basename(imageFilePath), {
        type: 'image/jpeg',
      });

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `קרא את כל הטקסט שמופיע בתמונה הזו. החזר רק את הטקסט, ללא הסברים נוספים. אם אין טקסט, כתב "אין טקסט בתמונה".`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBuffer.toString('base64')}`
                }
              }
            ]
          }
        ],
        max_tokens: 300,
        temperature: 0.1,
      });

      const extractedText = response.choices[0]?.message?.content || '';
      console.log(`✅ Text extracted: "${extractedText.substring(0, 50)}..."`);
      return extractedText.trim();
    } catch (error: any) {
      console.error('❌ Failed to extract text from image:', error);
      throw new Error(`OCR failed: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * ניתוח תמונה עם הקשר עסקי
   */
  async analyzeImageForBusiness(imageFilePath: string, businessContext?: string): Promise<string> {
    try {
      console.log(`💼 Analyzing image for business context: ${path.basename(imageFilePath)}`);

      const imageBuffer = await fs.readFile(imageFilePath);
      const imageFile = await toFile(imageBuffer, path.basename(imageFilePath), {
        type: 'image/jpeg',
      });

      const contextPrompt = businessContext 
        ? `הקשר עסקי: ${businessContext}\n\n`
        : '';

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `${contextPrompt}תאר את התמונה הזו בעברית. התמקד בתוכן הרלוונטי לעסקים, שיווק, או שירותים. אם יש טקסט בתמונה, קרא אותו. אם יש לוגו או מותג, זהה אותו. תן המלצות או תובנות רלוונטיות.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBuffer.toString('base64')}`
                }
              }
            ]
          }
        ],
        max_tokens: 600,
        temperature: 0.7,
      });

      const businessAnalysis = response.choices[0]?.message?.content || '';
      console.log(`✅ Business analysis complete: "${businessAnalysis.substring(0, 50)}..."`);
      return businessAnalysis.trim();
    } catch (error: any) {
      console.error('❌ Failed to analyze image for business:', error);
      throw new Error(`Business image analysis failed: ${error?.message || 'Unknown error'}`);
    }
  }
}


