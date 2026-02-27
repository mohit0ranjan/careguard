import prisma from '../utils/db.js';

export const getFallEvents = async (req, res) => {
    try {
        const events = await prisma.fallEvent.findMany({
            where: { user_id: req.user.id },
            orderBy: { timestamp: 'desc' }
        });
        res.json(events);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const createFallEvent = async (req, res) => {
    // Use when simulated manual trigger from the app SOS, or standard REST POST
    try {
        const event = await prisma.fallEvent.create({
            data: {
                user_id: req.user.id,
                detected: true,
                status: 'pending'
            }
        });
        res.status(201).json(event);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const resolveFallEvent = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // e.g. "resolved" -> "I am OK",  or "notify_sent" -> "Send Help"

    try {
        // Validate if event belongs to current user
        const existEvent = await prisma.fallEvent.findUnique({ where: { id } });

        if (!existEvent || existEvent.user_id !== req.user.id) {
            return res.status(404).json({ message: 'Not authorized or Not found' });
        }

        const updatedEvent = await prisma.fallEvent.update({
            where: { id },
            data: { status }
        });
        res.json(updatedEvent);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
