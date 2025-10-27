import { Request, Response } from 'express';
export declare class ChatController {
    private conversationService;
    constructor();
    sendMessage(req: Request, res: Response): Promise<void>;
    getConversations(req: Request, res: Response): Promise<void>;
    getConversation(req: Request, res: Response): Promise<void>;
    createConversation(req: Request, res: Response): Promise<void>;
    deleteConversation(req: Request, res: Response): Promise<void>;
    generateDynamicQuestions(req: Request, res: Response): Promise<void>;
    parsePdf(req: Request, res: Response): Promise<void>;
    generateCustomSystemPrompt(req: Request, res: Response): Promise<void>;
    updateUserBusinessName(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=chat.controller.d.ts.map