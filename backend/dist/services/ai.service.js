"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIService = void 0;
const openai_1 = __importDefault(require("openai"));
const env_js_1 = require("../config/env.js");
class AIService {
    constructor() {
        this.openai = new openai_1.default({
            apiKey: env_js_1.config.openai.apiKey,
        });
        this.defaultConfig = {
            model: env_js_1.config.openai.model,
            temperature: 0.7,
            maxTokens: 1000,
            systemPrompt: 'אתה סוכנת AI חכמה ומועילה. ענה בעברית בצורה ברורה וידידותית.'
        };
    }
    async generateResponse(messages, customConfig) {
        try {
            const aiConfig = { ...this.defaultConfig, ...customConfig };
            const openaiMessages = messages.map(msg => ({
                role: msg.role,
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
        }
        catch (error) {
            console.error('Error generating AI response:', error);
            throw new Error('Failed to generate AI response');
        }
    }
    async generateSystemPrompt(prompt) {
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
        }
        catch (error) {
            console.error('Error generating system prompt:', error);
            throw new Error('Failed to generate system prompt');
        }
    }
}
exports.AIService = AIService;
//# sourceMappingURL=ai.service.js.map