import { AIResponse, AIConfig, Message } from '../types/index.js';
export declare class AIService {
    private openai;
    private defaultConfig;
    constructor();
    generateResponse(messages: Message[], customConfig?: Partial<AIConfig>): Promise<AIResponse>;
    generateSystemPrompt(prompt: string): Promise<string>;
    generateDynamicQuestions(systemPrompt: string): Promise<string[]>;
    generateCustomSystemPrompt(combinedAnswers: string): Promise<string>;
}
export declare const aiService: AIService;
//# sourceMappingURL=ai.service.d.ts.map