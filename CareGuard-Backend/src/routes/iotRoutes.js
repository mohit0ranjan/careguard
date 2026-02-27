import express from 'express';
import authMiddleware from '../middleware/auth.js';
import { getFallStatus, getDeviceStatus, deviceHeartbeat, deviceAlert } from '../controllers/iotController.js';

const router = express.Router();

// Direct ESP32 Webhooks (No auth needed for simplicity in prototype)
router.post('/device/heartbeat', deviceHeartbeat);
router.post('/device/alert', deviceAlert);

// Mobile App Endpoints (Protected)
router.use(authMiddleware);
router.get('/fall-status', getFallStatus);
router.get('/device-status', getDeviceStatus);

export default router;
