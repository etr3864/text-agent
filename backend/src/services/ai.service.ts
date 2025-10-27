import OpenAI from 'openai';
import { config } from '../config/env.js';
import { AIResponse, AIConfig, Message } from '../types/index.js';

export class AIService {
  private openai: OpenAI;
  private defaultConfig: AIConfig;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
    
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
      
      // Convert messages to OpenAI format
      const openaiMessages = messages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      }));

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


