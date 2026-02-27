import prisma from '../utils/db.js';

export const getCaregivers = async (req, res) => {
    try {
        const caregivers = await prisma.caregiver.findMany({
            where: { user_id: req.user.id }
        });
        res.json(caregivers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const addCaregiver = async (req, res) => {
    const { name, phone } = req.body;

    try {
        const newCaregiver = await prisma.caregiver.create({
            data: {
                user_id: req.user.id,
                name,
                phone
            }
        });
        res.status(201).json(newCaregiver);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteCaregiver = async (req, res) => {
    const { id } = req.params;

    try {
        const verifyCaregiver = await prisma.caregiver.findUnique({ where: { id } });
        if (!verifyCaregiver || verifyCaregiver.user_id !== req.user.id) {
            return res.status(404).json({ message: 'Not authorized or Not found' });
        }

        await prisma.caregiver.delete({ where: { id } });
        res.json({ message: 'Caregiver removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
