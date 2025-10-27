import express from 'express';

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'text-agent-backend',
    version: '1.0.0'
  });
});

// API info endpoint
router.get('/info', (req, res) => {
  res.json({
    name: 'Text Agent Backend',
    version: '1.0.0',
    description: 'AI-powered text conversation service',
    endpoints: {
      health: '/api/health',
      info: '/api/info',
      chat: '/api/chat'
    }
  });
});

export default router;


