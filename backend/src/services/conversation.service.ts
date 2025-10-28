import { v4 as uuidv4 } from 'uuid';
import { Conversation, Message, ChatRequest, ChatResponse } from '../types/index';
import { AIService } from './ai.service';
import { SupabaseService } from './supabase.service';

export class ConversationService {
  private conversations: Map<string, Conversation> = new Map();
  private aiService: AIService;
  private supabaseService: SupabaseService;

  constructor() {
    this.aiService = new AIService();
    this.supabaseService = new SupabaseService();
  }

  async createConversation(title?: string): Promise<Conversation> {
    const conversation: Conversation = {
      id: uuidv4(),
      title: title || 'שיחה חדשה',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.conversations.set(conversation.id, conversation);
    return conversation;
  }

  async getConversation(id: string): Promise<Conversation | null> {
    return this.conversations.get(id) || null;
  }

  async getAllConversations(): Promise<Conversation[]> {
    return Array.from(this.conversations.values())
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    try {
      let conversation: Conversation;

      // Ensure user exists (by email or phone)
      if (request.userEmail) {
        let user = await this.supabaseService.getUser(request.userEmail);
        if (!user) {
          user = await this.supabaseService.createUser(request.userEmail);
        }
      } else if (request.userPhone) {
        let user = await this.supabaseService.getUserByPhone(request.userPhone);
        if (!user) {
          user = await this.supabaseService.createUserByPhone(request.userPhone);
        }
      }

      if (request.conversationId) {
        const existingConversation = await this.getConversation(request.conversationId);
        if (!existingConversation) {
          throw new Error('Conversation not found');
        }
        conversation = existingConversation;
      } else {
        conversation = await this.createConversation();
      }

      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content: request.message,
        timestamp: new Date(),
        conversationId: conversation.id
      };

      conversation.messages.push(userMessage);

      const messagesForAI = conversation.messages.filter(msg => msg.role !== 'system');

      // Determine system prompt: prefer request.systemPrompt; otherwise load from Supabase (by phone/email)
      let systemPromptToUse: string | undefined = request.systemPrompt;
      if (!systemPromptToUse) {
        if (request.userPhone) {
          const result = await this.supabaseService.getUserWithSystemPromptByPhone(request.userPhone);
          if (result?.systemPrompt?.prompt) {
            systemPromptToUse = result.systemPrompt.prompt;
          }
        } else if (request.userEmail) {
          const result = await this.supabaseService.getUserWithSystemPrompt(request.userEmail);
          if (result?.systemPrompt?.prompt) {
            systemPromptToUse = result.systemPrompt.prompt;
          }
        }
      }

      const aiResponse = await this.aiService.generateResponse(
        messagesForAI,
        systemPromptToUse ? { systemPrompt: systemPromptToUse } : undefined
      );

      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: aiResponse.content,
        timestamp: new Date(),
        conversationId: conversation.id
      };

      conversation.messages.push(assistantMessage);
      conversation.updatedAt = new Date();

      if (conversation.messages.length === 2) {
        conversation.title = this.generateTitle(request.message);
      }

      return {
        message: assistantMessage,
        conversationId: conversation.id,
        success: true
      };
    } catch (error) {
      console.error('Error sending message:', error);
      return {
        message: {} as Message,
        conversationId: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async deleteConversation(id: string): Promise<boolean> {
    return this.conversations.delete(id);
  }

  private generateTitle(message: string): string {
    const title = message.length > 50 ? message.substring(0, 50) + '...' : message;
    return title.trim();
  }
}


