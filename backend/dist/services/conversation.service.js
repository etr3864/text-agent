"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationService = void 0;
const uuid_1 = require("uuid");
const ai_service_1 = require("./ai.service");
const supabase_service_1 = require("./supabase.service");
class ConversationService {
    constructor() {
        this.conversations = new Map();
        this.aiService = new ai_service_1.AIService();
        this.supabaseService = new supabase_service_1.SupabaseService();
    }
    async createConversation(title) {
        const conversation = {
            id: (0, uuid_1.v4)(),
            title: title || 'שיחה חדשה',
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };
        this.conversations.set(conversation.id, conversation);
        return conversation;
    }
    async getConversation(id) {
        return this.conversations.get(id) || null;
    }
    async getAllConversations() {
        return Array.from(this.conversations.values())
            .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }
    async sendMessage(request) {
        try {
            let conversation;
            let userEmail = request.userEmail;
            if (userEmail) {
                let user = await this.supabaseService.getUser(userEmail);
                if (!user) {
                    console.log(`Creating new user: ${userEmail}`);
                    user = await this.supabaseService.createUser(userEmail);
                    if (!user) {
                        console.error(`Failed to create user: ${userEmail}`);
                        userEmail = undefined;
                    }
                }
            }
            else if (request.userPhone) {
                let user = await this.supabaseService.getUserByPhone(request.userPhone);
                if (!user) {
                    console.log(`Creating new user by phone: ${request.userPhone}`);
                    user = await this.supabaseService.createUserByPhone(request.userPhone);
                    if (!user) {
                        console.error(`Failed to create user by phone: ${request.userPhone}`);
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
            }
            else {
                conversation = await this.createConversation();
            }
            const userMessage = {
                id: (0, uuid_1.v4)(),
                role: 'user',
                content: request.message,
                timestamp: new Date(),
                conversationId: conversation.id
            };
            conversation.messages.push(userMessage);
            const messagesForAI = conversation.messages.filter(msg => msg.role !== 'system');
            const aiResponse = await this.aiService.generateResponse(messagesForAI, request.systemPrompt ? { systemPrompt: request.systemPrompt } : undefined);
            const assistantMessage = {
                id: (0, uuid_1.v4)(),
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
        }
        catch (error) {
            console.error('Error sending message:', error);
            return {
                message: {},
                conversationId: '',
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async deleteConversation(id) {
        return this.conversations.delete(id);
    }
    generateTitle(message) {
        const title = message.length > 50 ? message.substring(0, 50) + '...' : message;
        return title.trim();
    }
}
exports.ConversationService = ConversationService;
//# sourceMappingURL=conversation.service.js.map