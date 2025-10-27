import axios from 'axios';
import { supabaseService } from './supabase-service';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/chat';

class ApiService {
  private api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 60000, // 60 seconds for system prompt generation
    headers: {
      'Content-Type': 'application/json',
    },
  });

  constructor() {
    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Response Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  // User management - Direct Supabase calls
  async createUser(userData: {
    phone_number: string;
    name?: string;
  }) {
    const user = await supabaseService.createUser(userData);
    if (!user) {
      throw new Error('Failed to create user');
    }
    return { success: true, user };
  }

  async getUserByPhone(phoneNumber: string) {
    const userData = await supabaseService.getUserWithSystemPrompt(phoneNumber);
    if (!userData) {
      throw new Error('User not found');
    }
    return { success: true, ...userData };
  }

  // Custom system prompt generation - Backend API call
  async generateCustomSystemPrompt(request: {
    answers: string[];
    userPhone: string;
  }) {
    const response = await this.api.post('/generate-custom-prompt', request);
    return response.data;
  }

  // Chat functionality - Backend API calls
  async sendMessage(request: {
    message: string;
    conversationId?: string;
    userPhone: string;
  }) {
    const response = await this.api.post('/send', request);
    return response.data;
  }

  // System prompts - Direct Supabase calls
  async getAllSystemPrompts() {
    const prompts = await supabaseService.getAllSystemPrompts();
    return { success: true, systemPrompts: prompts };
  }

  // Update system prompt - Backend API call
  async updateSystemPrompt(id: string, prompt: string) {
    const response = await this.api.put(`/system-prompts/${id}`, { prompt });
    return response.data;
  }

  // Generate dynamic questions - Backend API call
  async generateDynamicQuestions(basicAnswers: {
    businessName: string;
    businessField: string;
    businessGoal: string;
  }) {
    const response = await this.api.post('/generate-dynamic-questions', basicAnswers);
    return response.data;
  }

  // Send first message to user - Backend API call
  async sendFirstMessage(userPhone: string) {
    const response = await this.api.post('/send-first-message', { userPhone });
    return response.data;
  }

  // Update user business name
  async updateUserBusinessName(userPhone: string, businessName: string) {
    const response = await this.api.put('/users/business-name', { userPhone, businessName });
    return response.data;
  }

  // Parse PDF file
  async parsePdf(formData: FormData) {
    const response = await this.api.post('/parse-pdf', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
}

export const apiService = new ApiService();
