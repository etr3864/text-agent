import { AIResponse, AIConfig, Message } from '../types/index.js';
export declare class AIService {
    private openai;
    private defaultConfig;
    private supabaseService;
    constructor();
    generateResponse(messages: Message[], customConfig?: Partial<AIConfig>): Promise<AIResponse>;
    generateSystemPrompt(prompt: string): Promise<string>;
}
//# sourceMappingURL=ai.service.d.ts.map