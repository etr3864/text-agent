import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server Configuration
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o',
  },
  
  // Security
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  apiRateLimit: parseInt(process.env.API_RATE_LIMIT || '100'),
  
  // CORS Configuration
  corsOrigin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // Database (for future use)
  database: {
    url: process.env.DATABASE_URL || '',
  },

  // Supabase Configuration
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },

  // Wasender API Configuration
  wasender: {
    baseUrl: process.env.WASENDER_BASE_URL || '',
    apiKey: process.env.WASENDER_API_KEY || '',
  },

  // OCR.space API Configuration
  ocr: {
    apiKey: process.env.OCR_API_KEY || ''
  }
};

// Validate required environment variables
export const validateConfig = () => {
  const required = ['OPENAI_API_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};


