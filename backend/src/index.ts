import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config, validateConfig } from './config/env';
import chatRoutes from './routes/chat.routes';
import healthRoutes from './routes/health.routes';
import whatsappRoutes from './routes/whatsapp.routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

// Validate configuration
validateConfig();

const app = express();

// Trust proxy configuration (avoid permissive 'true')
// In production behind a single proxy (e.g., Heroku/Render/NGINX) use 1; otherwise disable
if (config.nodeEnv === 'production') {
  app.set('trust proxy', 1);
} else {
  app.set('trust proxy', false);
}

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.apiRateLimit,
  message: 'Too many requests from this IP, please try again later.',
  skipSuccessfulRequests: true,
  standardHeaders: false, // Disable `RateLimit-*` headers in development
  legacyHeaders: false // Disable `X-RateLimit-*` headers
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`🚀 Text Agent Backend is running on port ${PORT}`);
  console.log(`📡 Environment: ${config.nodeEnv}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`💬 Chat API: http://localhost:${PORT}/api/chat`);
  console.log(`📲 WhatsApp Webhook: http://localhost:${PORT}/api/whatsapp/webhook`);
});

export default app;


