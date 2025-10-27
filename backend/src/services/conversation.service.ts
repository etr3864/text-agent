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
      let userEmail = request.userEmail;

      // If user email or phone is provided, ensure user exists in database
      if (userEmail) {
        let user = await this.supabaseService.getUser(userEmail);
        if (!user) {
          // Create user automatically with default system prompt
          console.log(`Creating new user: ${userEmail}`);
          user = await this.supabaseService.createUser(userEmail);
          if (!user) {
            console.error(`Failed to create user: ${userEmail}`);
            // Continue without user email if creation fails
            userEmail = undefined;
          }
        }
      } else if (request.userPhone) {
        let user = await this.supabaseService.getUserByPhone(request.userPhone);
        if (!user) {
          // Create user automatically with default system prompt
          console.log(`Creating new user by phone: ${request.userPhone}`);
          user = await this.supabaseService.createUserByPhone(request.userPhone);
          if (!user) {
            console.error(`Failed to create user by phone: ${request.userPhone}`);
            // Continue without user phone if creation fails
            request.userPhone = undefined;
          }
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

      // Create user message
      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content: request.message,
        timestamp: new Date(),
        conversationId: conversation.id
      };

      // Add user message to conversation
      conversation.messages.push(userMessage);

      // Prepare messages for AI (without system message, as it will be added by AI service)
      const messagesForAI = conversation.messages.filter(msg => msg.role !== 'system');
      
      // Generate AI response with user email or phone for system prompt lookup
      const aiResponse = await this.aiService.generateResponse(
        messagesForAI, 
        request.systemPrompt ? { systemPrompt: request.systemPrompt } : undefined,
        userEmail,
        request.userPhone
      );

      // Create assistant message
      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: aiResponse.content,
        timestamp: new Date(),
        conversationId: conversation.id
      };

      // Add assistant message to conversation
      conversation.messages.push(assistantMessage);
      conversation.updatedAt = new Date();

      // Update conversation title if it's the first message
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
    // Simple title generation - take first 50 characters
    const title = message.length > 50 ? message.substring(0, 50) + '...' : message;
    return title.trim();
  }
}


