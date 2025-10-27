export interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    conversationId: string;
}
export interface Conversation {
    id: string;
    title: string;
    messages: Message[];
    createdAt: Date;
    updatedAt: Date;
}
export interface ChatRequest {
    message: string;
    conversationId?: string;
    systemPrompt?: string;
    userEmail?: string;
    userPhone?: string;
}
export interface ChatResponse {
    message: Message;
    conversationId: string;
    success: boolean;
    error?: string;
}
export interface AIResponse {
    content: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}
export interface APIError {
    message: string;
    code: string;
    statusCode: number;
}
export interface AIConfig {
    model: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
}
//# sourceMappingURL=index.d.ts.map