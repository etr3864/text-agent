"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
router.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'text-agent-backend',
        version: '1.0.0'
    });
});
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
exports.default = router;
//# sourceMappingURL=health.routes.js.map