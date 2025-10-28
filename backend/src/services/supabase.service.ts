import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config/env';

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

export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    const key = config.supabase.serviceRoleKey || config.supabase.anonKey;
    this.supabase = createClient(config.supabase.url, key);
  }

  // System Prompts methods
  async getSystemPrompt(id: string): Promise<SystemPrompt | null> {
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
    } catch (error) {
      console.error('Error in getSystemPrompt:', error);
      return null;
    }
  }

  async getAllSystemPrompts(): Promise<SystemPrompt[]> {
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
    } catch (error) {
      console.error('Error in getAllSystemPrompts:', error);
      return [];
    }
  }

  async getDefaultSystemPrompt(): Promise<SystemPrompt | null> {
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
    } catch (error) {
      console.error('Error in getDefaultSystemPrompt:', error);
      return null;
    }
  }

  // User methods
  async getUser(email: string): Promise<User | null> {
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
    } catch (error) {
      console.error('Error in getUser:', error);
      return null;
    }
  }

  async getUserByPhone(phoneNumber: string): Promise<User | null> {
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
    } catch (error) {
      console.error('Error in getUserByPhone:', error);
      return null;
    }
  }

  async getUserBySystemPromptId(systemPromptId: string): Promise<User | null> {
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
    } catch (error) {
      console.error('Error in getUserBySystemPromptId:', error);
      return null;
    }
  }

  async createUser(email: string, name?: string, systemPromptId?: string, phone?: string, businessName?: string): Promise<User | null> {
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
    } catch (error) {
      console.error('Error in createUser:', error);
      return null;
    }
  }

  async createUserByPhone(phoneNumber: string, name?: string, systemPromptId?: string): Promise<User | null> {
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
    } catch (error) {
      console.error('Error in createUserByPhone:', error);
      return null;
    }
  }

  async updateUserSystemPrompt(userId: string, systemPromptId: string): Promise<boolean> {
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
    } catch (error) {
      console.error('Error in updateUserSystemPrompt:', error);
      return false;
    }
  }

  async getUserWithSystemPrompt(email: string): Promise<{ user: User; systemPrompt: SystemPrompt | null } | null> {
    try {
      const user = await this.getUser(email);
      if (!user) {
        return null;
      }

      let systemPrompt: SystemPrompt | null = null;
      if (user.system_prompt_id) {
        systemPrompt = await this.getSystemPrompt(user.system_prompt_id);
      }

      // If user doesn't have a system prompt or it's not found, use default
      if (!systemPrompt) {
        systemPrompt = await this.getDefaultSystemPrompt();
      }

      return { user, systemPrompt };
    } catch (error) {
      console.error('Error in getUserWithSystemPrompt:', error);
      return null;
    }
  }

  async getUserWithSystemPromptByPhone(phoneNumber: string): Promise<{ user: User; systemPrompt: SystemPrompt | null } | null> {
    try {
      const user = await this.getUserByPhone(phoneNumber);
      if (!user) {
        return null;
      }

      let systemPrompt: SystemPrompt | null = null;
      if (user.system_prompt_id) {
        systemPrompt = await this.getSystemPrompt(user.system_prompt_id);
      }

      // If user doesn't have a system prompt or it's not found, use default
      if (!systemPrompt) {
        systemPrompt = await this.getDefaultSystemPrompt();
      }

      return { user, systemPrompt };
    } catch (error) {
      console.error('Error in getUserWithSystemPromptByPhone:', error);
      return null;
    }
  }

  async createCustomSystemPrompt(prompt: string, userPhone?: string): Promise<SystemPrompt | null> {
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
    } catch (error) {
      console.error('Error in createCustomSystemPrompt:', error);
      return null;
    }
  }

  async updateSystemPrompt(id: string, prompt: string): Promise<SystemPrompt | null> {
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
    } catch (error) {
      console.error('Error in updateSystemPrompt:', error);
      return null;
    }
  }

  async updateUserWhatsAppStatus(userId: string, status: string): Promise<boolean> {
    try {
      const updateData: any = { whatsapp_status: status };
      
      if (status === 'sent') {
        updateData.first_message_sent_at = new Date().toISOString();
      } else if (status === 'active') {
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
    } catch (error) {
      console.error('Error in updateUserWhatsAppStatus:', error);
      return false;
    }
  }

  // עדכון שם העסק של משתמש
  async updateUserBusinessName(phoneNumber: string, businessName: string): Promise<boolean> {
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
    } catch (error) {
      console.error('Error updating user business name:', error);
      return false;
    }
  }

  async getUsersPendingFirstMessage(): Promise<User[]> {
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
    } catch (error) {
      console.error('Error in getUsersPendingFirstMessage:', error);
      return [];
    }
  }
}

export const supabaseService = new SupabaseService();
