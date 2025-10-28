"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseService = exports.SupabaseService = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const env_1 = require("../config/env");
class SupabaseService {
    constructor() {
        const key = env_1.config.supabase.serviceRoleKey || env_1.config.supabase.anonKey;
        this.supabase = (0, supabase_js_1.createClient)(env_1.config.supabase.url, key);
    }
    async getSystemPrompt(id) {
        try {
            const { data, error } = await this.supabase
                .from('system_prompts')
                .select('*')
                .eq('id', id)
                .eq('is_active', true)
                .single();
            if (error) {
                console.error('Error fetching system prompt:', error);
                return null;
            }
            return data;
        }
        catch (error) {
            console.error('Error in getSystemPrompt:', error);
            return null;
        }
    }
    async getAllSystemPrompts() {
        try {
            const { data, error } = await this.supabase
                .from('system_prompts')
                .select('*')
                .eq('is_active', true)
                .order('name');
            if (error) {
                console.error('Error fetching system prompts:', error);
                return [];
            }
            return data || [];
        }
        catch (error) {
            console.error('Error in getAllSystemPrompts:', error);
            return [];
        }
    }
    async getDefaultSystemPrompt() {
        try {
            const { data, error } = await this.supabase
                .from('system_prompts')
                .select('*')
                .eq('name', 'ברירת מחדל')
                .eq('is_active', true)
                .single();
            if (error) {
                console.error('Error fetching default system prompt:', error);
                return null;
            }
            return data;
        }
        catch (error) {
            console.error('Error in getDefaultSystemPrompt:', error);
            return null;
        }
    }
    async getUser(email) {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .single();
            if (error) {
                console.error('Error fetching user:', error);
                return null;
            }
            return data;
        }
        catch (error) {
            console.error('Error in getUser:', error);
            return null;
        }
    }
    async getUserByPhone(phoneNumber) {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('*')
                .eq('phone_number', phoneNumber)
                .single();
            if (error) {
                console.error('Error fetching user by phone:', error);
                return null;
            }
            return data;
        }
        catch (error) {
            console.error('Error in getUserByPhone:', error);
            return null;
        }
    }
    async getUserBySystemPromptId(systemPromptId) {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('*')
                .eq('system_prompt_id', systemPromptId)
                .single();
            if (error) {
                console.error('Error fetching user by system prompt ID:', error);
                return null;
            }
            return data;
        }
        catch (error) {
            console.error('Error in getUserBySystemPromptId:', error);
            return null;
        }
    }
    async createUser(email, name, systemPromptId, phone, businessName) {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .insert({
                email,
                name,
                system_prompt_id: systemPromptId,
                phone_number: phone,
                business_name: businessName
            })
                .select()
                .single();
            if (error) {
                console.error('Error creating user:', error);
                return null;
            }
            return data;
        }
        catch (error) {
            console.error('Error in createUser:', error);
            return null;
        }
    }
    async createUserByPhone(phoneNumber, name, systemPromptId) {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .insert({
                phone_number: phoneNumber,
                name,
                system_prompt_id: systemPromptId
            })
                .select()
                .single();
            if (error) {
                console.error('Error creating user by phone:', error);
                return null;
            }
            return data;
        }
        catch (error) {
            console.error('Error in createUserByPhone:', error);
            return null;
        }
    }
    async updateUserSystemPrompt(userId, systemPromptId) {
        try {
            const { error } = await this.supabase
                .from('users')
                .update({
                system_prompt_id: systemPromptId,
                updated_at: new Date().toISOString()
            })
                .eq('id', userId);
            if (error) {
                console.error('Error updating user system prompt:', error);
                return false;
            }
            return true;
        }
        catch (error) {
            console.error('Error in updateUserSystemPrompt:', error);
            return false;
        }
    }
    async getUserWithSystemPrompt(email) {
        try {
            const user = await this.getUser(email);
            if (!user) {
                return null;
            }
            let systemPrompt = null;
            if (user.system_prompt_id) {
                systemPrompt = await this.getSystemPrompt(user.system_prompt_id);
            }
            if (!systemPrompt) {
                systemPrompt = await this.getDefaultSystemPrompt();
            }
            return { user, systemPrompt };
        }
        catch (error) {
            console.error('Error in getUserWithSystemPrompt:', error);
            return null;
        }
    }
    async getUserWithSystemPromptByPhone(phoneNumber) {
        try {
            const user = await this.getUserByPhone(phoneNumber);
            if (!user) {
                return null;
            }
            let systemPrompt = null;
            if (user.system_prompt_id) {
                systemPrompt = await this.getSystemPrompt(user.system_prompt_id);
            }
            if (!systemPrompt) {
                systemPrompt = await this.getDefaultSystemPrompt();
            }
            return { user, systemPrompt };
        }
        catch (error) {
            console.error('Error in getUserWithSystemPromptByPhone:', error);
            return null;
        }
    }
    async createCustomSystemPrompt(prompt, userPhone) {
        try {
            const { data, error } = await this.supabase
                .from('system_prompts')
                .insert({
                name: `Custom Prompt - ${userPhone || 'Anonymous'}`,
                description: 'System prompt generated based on user answers',
                prompt: prompt,
                is_default: false,
                created_by: userPhone || 'system'
            })
                .select()
                .single();
            if (error) {
                console.error('Error creating custom system prompt:', error);
                return null;
            }
            return data;
        }
        catch (error) {
            console.error('Error in createCustomSystemPrompt:', error);
            return null;
        }
    }
    async updateSystemPrompt(id, prompt) {
        try {
            const { data, error } = await this.supabase
                .from('system_prompts')
                .update({
                prompt: prompt,
                updated_at: new Date().toISOString()
            })
                .eq('id', id)
                .select()
                .single();
            if (error) {
                console.error('Error updating system prompt:', error);
                return null;
            }
            return data;
        }
        catch (error) {
            console.error('Error in updateSystemPrompt:', error);
            return null;
        }
    }
    async updateUserWhatsAppStatus(userId, status) {
        try {
            const updateData = { whatsapp_status: status };
            if (status === 'sent') {
                updateData.first_message_sent_at = new Date().toISOString();
            }
            else if (status === 'active') {
                updateData.last_message_at = new Date().toISOString();
            }
            const { error } = await this.supabase
                .from('users')
                .update(updateData)
                .eq('id', userId);
            if (error) {
                console.error('Error updating user WhatsApp status:', error);
                return false;
            }
            return true;
        }
        catch (error) {
            console.error('Error in updateUserWhatsAppStatus:', error);
            return false;
        }
    }
    async updateUserBusinessName(phoneNumber, businessName) {
        try {
            const { error } = await this.supabase
                .from('users')
                .update({ business_name: businessName })
                .eq('phone_number', phoneNumber);
            if (error) {
                console.error('Error updating user business name:', error);
                return false;
            }
            return true;
        }
        catch (error) {
            console.error('Error updating user business name:', error);
            return false;
        }
    }
    async getUsersPendingFirstMessage() {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('*')
                .eq('whatsapp_status', 'pending');
            if (error) {
                console.error('Error getting users pending first message:', error);
                return [];
            }
            return data || [];
        }
        catch (error) {
            console.error('Error in getUsersPendingFirstMessage:', error);
            return [];
        }
    }
}
exports.SupabaseService = SupabaseService;
exports.supabaseService = new SupabaseService();
//# sourceMappingURL=supabase.service.js.map