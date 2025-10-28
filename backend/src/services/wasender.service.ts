import axios from 'axios';
import { config } from '../config/env.js';

export class WasenderService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = config?.wasender?.baseUrl || process.env.WASENDER_BASE_URL || '';
    this.apiKey = config?.wasender?.apiKey || process.env.WASENDER_API_KEY || '';
  }

  async sendMessage(phoneNumber: string, text: string): Promise<{ success: boolean; message?: string; error?: any }> {
    try {
      if (!this.baseUrl || !this.apiKey) {
        console.error('Wasender config missing');
        return { success: false, error: 'Wasender configuration missing' };
      }

      const url = `${this.baseUrl}/api/send-message`;
      const payload = {
        to: phoneNumber,
        text: text,
      } as any;

      const headers: any = {
        'Content-Type': 'application/json',
        // Primary auth per Wasender docs
        'Authorization': `Bearer ${this.apiKey}`,
        // Fallback for older setups
        'X-API-KEY': this.apiKey,
      };

      const res = await axios.post(url, payload, { headers, timeout: 15000 });
      
      if (res.status >= 200 && res.status < 300) {
        return { success: true, message: 'Message sent successfully' };
      } else {
        return { success: false, error: res.data || 'Unknown error' };
      }
    } catch (error: any) {
      console.error('Error sending WhatsApp message via Wasender:', error);
      return { success: false, error: error.response?.data || error.message };
    }
  }
}

export const wasenderService = new WasenderService();
