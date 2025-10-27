import { Conversation, ChatRequest, ChatResponse } from '../types/index';
export declare class ConversationService {
    private conversations;
    private aiService;
    private supabaseService;
    constructor();
    createConversation(title?: string): Promise<Conversation>;
    getConversation(id: string): Promise<Conversation | null>;
    getAllConversations(): Promise<Conversation[]>;
    sendMessage(request: ChatRequest): Promise<ChatResponse>;
    deleteConversation(id: string): Promise<boolean>;
    private generateTitle;
}
//# sourceMappingURL=conversation.service.d.ts.map