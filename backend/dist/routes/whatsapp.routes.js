"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const whatsapp_controller_js_1 = require("../controllers/whatsapp.controller.js");
const router = express_1.default.Router();
const whatsappController = new whatsapp_controller_js_1.WhatsAppController();
router.post('/webhook', whatsappController.webhook.bind(whatsappController));
router.get('/webhook', (req, res) => res.status(200).json({ ok: true }));
router.post('/send-first-message', whatsappController.sendFirstMessage.bind(whatsappController));
exports.default = router;
//# sourceMappingURL=whatsapp.routes.js.map