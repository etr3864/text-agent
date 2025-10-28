import OpenAI from 'openai';
import { config } from '../config/env.js';
import { AIResponse, AIConfig, Message } from '../types/index.js';
import { SupabaseService } from './supabase.service.js';

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
      temperature: 0.7,
      maxTokens: 1000,
      systemPrompt: 'אתה סוכנת AI חכמה ומועילה. ענה בעברית בצורה ברורה וידידותית.'
    };
  }

  async generateResponse(
    messages: Message[],
    customConfig?: Partial<AIConfig>
  ): Promise<AIResponse> {
    try {
      const aiConfig = { ...this.defaultConfig, ...customConfig };
      
      // Resolve system prompt: prefer custom; otherwise try Supabase default; otherwise internal fallback
      let systemPromptToUse = (aiConfig.systemPrompt && typeof aiConfig.systemPrompt === 'string' && aiConfig.systemPrompt.trim().length > 0)
        ? aiConfig.systemPrompt.trim()
        : '';

      if (!systemPromptToUse) {
        try {
          const def = await this.supabaseService.getDefaultSystemPrompt();
          if (def?.prompt) {
            systemPromptToUse = def.prompt;
          }
        } catch (e) {
          // ignore and fall back to internal default
        }
      }

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

      const combinedSystem = guardrails
        ? `${guardrails}\n\n${systemPromptToUse}`
        : systemPromptToUse;

      // Convert messages to OpenAI format and inject combined system prompt
      const openaiMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];
      openaiMessages.push({ role: 'system', content: combinedSystem });

      openaiMessages.push(
        ...messages.map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content
        }))
      );

      const completion = await this.openai.chat.completions.create({
        model: aiConfig.model,
        messages: openaiMessages,
        temperature: aiConfig.temperature,
        max_tokens: aiConfig.maxTokens,
      });

      const response = completion.choices[0]?.message?.content || '';
      const usage = completion.usage;

      return {
        content: response,
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


