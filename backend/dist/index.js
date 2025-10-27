"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const env_js_1 = require("./config/env.js");
const chat_routes_js_1 = __importDefault(require("./routes/chat.routes.js"));
const health_routes_js_1 = __importDefault(require("./routes/health.routes.js"));
const error_middleware_js_1 = require("./middleware/error.middleware.js");
(0, env_js_1.validateConfig)();
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, compression_1.default)());
app.use((0, cors_1.default)({
    origin: env_js_1.config.corsOrigin,
    credentials: true
}));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: env_js_1.config.apiRateLimit,
    message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api/health', health_routes_js_1.default);
app.use('/api/chat', chat_routes_js_1.default);
app.use(error_middleware_js_1.notFoundHandler);
app.use(error_middleware_js_1.errorHandler);
const PORT = env_js_1.config.port;
app.listen(PORT, () => {
    console.log(`🚀 Text Agent Backend is running on port ${PORT}`);
    console.log(`📡 Environment: ${env_js_1.config.nodeEnv}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
    console.log(`💬 Chat API: http://localhost:${PORT}/api/chat`);
});
exports.default = app;
//# sourceMappingURL=index.js.map