"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.wasenderService = exports.WasenderService = void 0;
const axios_1 = __importDefault(require("axios"));
const env_js_1 = require("../config/env.js");
class WasenderService {
    constructor() {
        this.baseUrl = env_js_1.config?.wasender?.baseUrl || process.env.WASENDER_BASE_URL || '';
        this.apiKey = env_js_1.config?.wasender?.apiKey || process.env.WASENDER_API_KEY || '';
    }
    async sendMessage(phoneNumber, text) {
        try {
            if (!this.baseUrl || !this.apiKey) {
                console.error('Wasender config missing');
                return { success: false, error: 'Wasender configuration missing' };
            }
            const url = `${this.baseUrl}/api/send-message`;
            const payload = {
                to: phoneNumber,
                text: text,
            };
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                'X-API-KEY': this.apiKey,
            };
            const res = await axios_1.default.post(url, payload, { headers, timeout: 15000 });
            if (res.status >= 200 && res.status < 300) {
                return { success: true, message: 'Message sent successfully' };
            }
            else {
                return { success: false, error: res.data || 'Unknown error' };
            }
        }
        catch (error) {
            console.error('Error sending WhatsApp message via Wasender:', error);
            return { success: false, error: error.response?.data || error.message };
        }
    }
}
exports.WasenderService = WasenderService;
exports.wasenderService = new WasenderService();
//# sourceMappingURL=wasender.service.js.map