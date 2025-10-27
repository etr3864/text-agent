export interface SystemPrompt {
    id: string;
    name: string;
    description: string | null;
    prompt: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}
export interface User {
    id: string;
    email: string | null;
    phone_number: string | null;
    name: string | null;
    business_name: string | null;
    system_prompt_id: string | null;
    created_at: string;
    updated_at: string;
    whatsapp_status: string | null;
    first_message_sent_at: string | null;
    last_message_at: string | null;
}
export declare class SupabaseService {
    private supabase;
    constructor();
    getSystemPrompt(id: string): Promise<SystemPrompt | null>;
    getAllSystemPrompts(): Promise<SystemPrompt[]>;
    getDefaultSystemPrompt(): Promise<SystemPrompt | null>;
    getUser(email: string): Promise<User | null>;
    getUserByPhone(phoneNumber: string): Promise<User | null>;
    createUser(email: string, name?: string, systemPromptId?: string, phone?: string, businessName?: string): Promise<User | null>;
    createUserByPhone(phoneNumber: string, name?: string, systemPromptId?: string): Promise<User | null>;
    updateUserSystemPrompt(userId: string, systemPromptId: string): Promise<boolean>;
    getUserWithSystemPrompt(email: string): Promise<{
        user: User;
        systemPrompt: SystemPrompt | null;
    } | null>;
    getUserWithSystemPromptByPhone(phoneNumber: string): Promise<{
        user: User;
        systemPrompt: SystemPrompt | null;
    } | null>;
    createCustomSystemPrompt(prompt: string, userPhone?: string): Promise<SystemPrompt | null>;
    updateSystemPrompt(id: string, prompt: string): Promise<SystemPrompt | null>;
    updateUserWhatsAppStatus(userId: string, status: string): Promise<boolean>;
    updateUserBusinessName(phoneNumber: string, businessName: string): Promise<boolean>;
    getUsersPendingFirstMessage(): Promise<User[]>;
}
export declare const supabaseService: SupabaseService;
//# sourceMappingURL=supabase.service.d.ts.map