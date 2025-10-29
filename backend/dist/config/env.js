"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateConfig = exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '..', '..', '.env') });
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
exports.config = {
    port: process.env.PORT || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',
    openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        model: process.env.OPENAI_MODEL || 'gpt-4o',
    },
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    apiRateLimit: parseInt(process.env.API_RATE_LIMIT || '100'),
    corsOrigin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    logLevel: process.env.LOG_LEVEL || 'info',
    database: {
        url: process.env.DATABASE_URL || '',
    },
    supabase: {
        url: process.env.SUPABASE_URL || '',
        anonKey: process.env.SUPABASE_ANON_KEY || '',
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    },
    wasender: {
        baseUrl: process.env.WASENDER_BASE_URL || '',
        apiKey: process.env.WASENDER_API_KEY || '',
    },
    ocr: {
        apiKey: process.env.OCR_API_KEY || ''
    },
    llamaindex: {
        apiKey: process.env.LLAMAINDEX_API_KEY || '',
        baseUrl: process.env.LLAMAINDEX_BASE_URL || 'https://api.llamaindex.ai',
    }
};
const validateConfig = () => {
    const required = ['OPENAI_API_KEY'];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
};
exports.validateConfig = validateConfig;
//# sourceMappingURL=env.js.map