export declare class WasenderService {
    private baseUrl;
    private apiKey;
    constructor();
    sendMessage(phoneNumber: string, text: string): Promise<{
        success: boolean;
        message?: string;
        error?: any;
    }>;
}
export declare const wasenderService: WasenderService;
//# sourceMappingURL=wasender.service.d.ts.map