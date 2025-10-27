import { supabase, User, SystemPrompt } from './supabase';

export class SupabaseService {
  // User management
  async createUser(userData: {
    phone_number: string;
    name?: string;
  }): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert({
          phone_number: userData.phone_number,
          name: userData.name || null,
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

  async getUserByPhone(phoneNumber: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('phone_number', phoneNumber)
        .single();

      if (error) {
        console.error('Error getting user by phone:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getUserByPhone:', error);
      return null;
    }
  }

  async getUserWithSystemPrompt(phoneNumber: string): Promise<{ user: User; systemPrompt: SystemPrompt | null } | null> {
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
      console.error('Error in getUserWithSystemPrompt:', error);
      return null;
    }
  }

  // System Prompt management
  async createSystemPrompt(promptData: {
    name: string;
    description?: string;
    prompt: string;
    is_default?: boolean;
    created_by?: string;
  }): Promise<SystemPrompt | null> {
    try {
      const { data, error } = await supabase
        .from('system_prompts')
        .insert({
          name: promptData.name,
          description: promptData.description || null,
          prompt: promptData.prompt,
          is_default: promptData.is_default || false,
          created_by: promptData.created_by || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating system prompt:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in createSystemPrompt:', error);
      return null;
    }
  }

  async getSystemPrompt(id: string): Promise<SystemPrompt | null> {
    try {
      const { data, error } = await supabase
        .from('system_prompts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error getting system prompt:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getSystemPrompt:', error);
      return null;
    }
  }

  async getDefaultSystemPrompt(): Promise<SystemPrompt | null> {
    try {
      const { data, error } = await supabase
        .from('system_prompts')
        .select('*')
        .eq('is_default', true)
        .single();

      if (error) {
        console.error('Error getting default system prompt:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getDefaultSystemPrompt:', error);
      return null;
    }
  }

  async getAllSystemPrompts(): Promise<SystemPrompt[]> {
    try {
      const { data, error } = await supabase
        .from('system_prompts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting all system prompts:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllSystemPrompts:', error);
      return [];
    }
  }

  async updateUserSystemPrompt(userId: string, systemPromptId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ system_prompt_id: systemPromptId })
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

  // Custom system prompt generation
  async createCustomSystemPrompt(prompt: string, userPhone?: string): Promise<SystemPrompt | null> {
    try {
      const { data, error } = await supabase
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
}

export const supabaseService = new SupabaseService();



