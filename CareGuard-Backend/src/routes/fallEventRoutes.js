import express from 'express';
import authMiddleware from '../middleware/auth.js';
import { getFallEvents, createFallEvent, resolveFallEvent } from '../controllers/fallEventController.js';

const router = express.Router();

router.use(authMiddleware);

router.route('/')
    .get(getFallEvents)
    .post(createFallEvent);

router.put('/:id', resolveFallEvent);

export default router;
