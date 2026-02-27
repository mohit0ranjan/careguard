import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import medicineRoutes from './routes/medicineRoutes.js';
import iotRoutes from './routes/iotRoutes.js';
import caregiverRoutes from './routes/caregiverRoutes.js';
import fallEventRoutes from './routes/fallEventRoutes.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api', iotRoutes); // /api/fall-status and /api/device-status
app.use('/api/fall-events', fallEventRoutes);
app.use('/api/caregivers', caregiverRoutes);

app.get('/', (req, res) => {
    res.json({ message: "CareGuard API is running!" });
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

export default app;
