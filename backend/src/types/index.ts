// Message Types
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  conversationId: string;
}

// Conversation Types
export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

// API Request/Response Types
export interface ChatRequest {
  message: string;
  conversationId?: string;
  systemPrompt?: string;
  userEmail?: string;
  userPhone?: string;
  customerGender?: string;
}

export interface ChatResponse {
  message: Message;
  conversationId: string;
  success: boolean;
  error?: string;
}

// AI Service Types
export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Error Types
export interface APIError {
  message: string;
  code: string;
  statusCode: number;
}

// Configuration Types
export interface AIConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
}


