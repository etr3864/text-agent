import { AIResponse, AIConfig, Message } from '../types/index.js';
export declare class AIService {
    private openai;
    private defaultConfig;
    private supabaseService;
    constructor();
    transcribeWav(filePath: string): Promise<string>;
    generateResponse(messages: Message[], customConfig?: Partial<AIConfig>, isForWhatsApp?: boolean): Promise<AIResponse>;
    private validateResponseLength;
    generateSystemPrompt(prompt: string): Promise<string>;
}
//# sourceMappingURL=ai.service.d.ts.map