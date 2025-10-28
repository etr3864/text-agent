import { Request, Response } from 'express';
export declare class WhatsAppController {
    private supabase;
    private normalizePhoneNumber;
    webhook(req: Request, res: Response): Promise<void>;
    sendFirstMessage(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=whatsapp.controller.d.ts.map