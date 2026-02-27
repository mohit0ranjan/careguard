import express from 'express';
import authMiddleware from '../middleware/auth.js';
import { getCaregivers, addCaregiver, deleteCaregiver } from '../controllers/caregiverController.js';

const router = express.Router();

router.use(authMiddleware);

router.route('/')
    .get(getCaregivers)
    .post(addCaregiver);

router.delete('/:id', deleteCaregiver);

export default router;
