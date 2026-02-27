import express from 'express';
import authMiddleware from '../middleware/auth.js';
import { getMedicines, addMedicine, updateMedicine, deleteMedicine, explainMedicine } from '../controllers/medicineController.js';

const router = express.Router();

router.use(authMiddleware);

router.route('/')
    .get(getMedicines)
    .post(addMedicine);

router.route('/:id')
    .put(updateMedicine)
    .delete(deleteMedicine);

router.post('/explain', explainMedicine);

export default router;
