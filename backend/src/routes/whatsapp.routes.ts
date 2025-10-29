import express from 'express';
import { WhatsAppController } from '../controllers/whatsapp.controller';

const router = express.Router();
const whatsappController = new WhatsAppController();

router.post('/webhook', whatsappController.webhook.bind(whatsappController));
router.get('/webhook', (req, res) => res.status(200).json({ ok: true }));

router.post('/send-first-message', whatsappController.sendFirstMessage.bind(whatsappController));
router.post('/stop-simulation', whatsappController.stopSimulation.bind(whatsappController));

export default router;
