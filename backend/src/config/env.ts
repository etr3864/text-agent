import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server Configuration
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
  },
  
  // Security
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  apiRateLimit: parseInt(process.env.API_RATE_LIMIT || '100'),
  
  // CORS Configuration
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // Database (for future use)
  database: {
    url: process.env.DATABASE_URL || '',
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


