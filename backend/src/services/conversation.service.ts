import { v4 as uuidv4 } from 'uuid';
import { Conversation, Message, ChatRequest, ChatResponse } from '../types/index';
import { AIService } from './ai.service';
import { SupabaseService } from './supabase.service';

export class ConversationService {
  private conversations: Map<string, Conversation> = new Map();
  private aiService: AIService;
  private supabaseService: SupabaseService;
  
  // הגבלת קונטקסט ל-35 הודעות אחרונות
  private readonly MAX_MESSAGES = 35;

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

      // Add customer gender information to system prompt if available
      if (request.customerGender && systemPromptToUse) {
        const genderInstruction = `\n\n**מידע חשוב על הלקוח:** הלקוח הוא ${request.customerGender}. פנה אליו בלשון המתאימה למגדר שלו.`;
        systemPromptToUse += genderInstruction;
      }

      const aiResponse = await this.aiService.generateResponse(
        messagesForAI,
        systemPromptToUse ? { systemPrompt: systemPromptToUse } : undefined,
        true // isForWhatsApp = true
      );

      // Check if this is the first response from the agent (conversation.messages.length === 1 means only user message exists)
      const isFirstAgentResponse = conversation.messages.length === 1;
      
      // If this is NOT the first agent response, remove greetings from the response
      let cleanedContent = aiResponse.content;
      if (!isFirstAgentResponse) {
        // Remove common greetings and agent name mentions
        cleanedContent = cleanedContent
          .replace(/שלום[,\s]*/gi, '') // Remove "שלום" and "שלום,"
          .replace(/היי[!,\s]*/gi, '') // Remove "היי!" and "היי,"
          .replace(/אני דנה[,\s]*/gi, '') // Remove "אני דנה" and "אני דנה,"
          .replace(/^[,\s]+/, '') // Remove leading commas and spaces
          .trim();
      }

      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: cleanedContent,
        timestamp: new Date(),
        conversationId: conversation.id
      };

      conversation.messages.push(assistantMessage);
      conversation.updatedAt = new Date();
      
      // גריסת הודעות ישנות - שמירה של 35 הודעות אחרונות בלבד
      if (conversation.messages.length > this.MAX_MESSAGES) {
        const numToRemove = conversation.messages.length - this.MAX_MESSAGES;
        conversation.messages.splice(0, numToRemove);
        console.log(`🗑️  Pruned ${numToRemove} old messages. Current count: ${conversation.messages.length}`);
      }

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
    const deleted = this.conversations.delete(id);
    if (deleted) {
      console.log(`🗑️  Deleted conversation: ${id}`);
    }
    return deleted;
  }
  
  // מחיקת כל השיחות (שימושי לניקוי כללי)
  async clearAllConversations(): Promise<void> {
    const count = this.conversations.size;
    this.conversations.clear();
    console.log(`🗑️  Cleared all conversations (${count} total)`);
  }

  private generateTitle(message: string): string {
    const title = message.length > 50 ? message.substring(0, 50) + '...' : message;
    return title.trim();
  }
}


