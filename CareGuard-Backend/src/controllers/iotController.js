import prisma from '../utils/db.js';
import { sendFallAlert } from '../utils/smsService.js';

// --- IN-MEMORY DEVICE STATE ---
// We track this locally. In a large production app with multiple users, 
// this would be a Map checking individual device IDs or saved to Redis.
let lastHeartbeatTime = 0;
let currentGaugeStatus = 'Offline';
let activeFallAlert = false;

// 1. ESP32 sends a Ping here every 3 seconds
export const deviceHeartbeat = async (req, res) => {
    try {
        const { status } = req.body;

        lastHeartbeatTime = Date.now();
        if (status) {
            currentGaugeStatus = status;
        }

        res.status(200).json({ success: true, message: 'Heartbeat received' });
    } catch (error) {
        console.error('Heartbeat Error:', error.message);
        res.status(500).json({ success: false });
    }
};

// 2. ESP32 strictly hits this ONLY if a fall happens
export const deviceAlert = async (req, res) => {
    try {
        const { fallDetected, status } = req.body;

        lastHeartbeatTime = Date.now();

        if (fallDetected) {
            activeFallAlert = true; // Turn flag on
            if (status) {
                currentGaugeStatus = status;
            }

            // TRIGGER SMS OR WHATSAPP ALERT!
            sendFallAlert('🚨 URGENT: A fall has been detected by CareGuard! Please check on the person immediately.');
        }


        res.status(200).json({ success: true, message: 'Alert Triggered' });
    } catch (error) {
        console.error('Device Alert Error:', error.message);
        res.status(500).json({ success: false });
    }
};

// 3. App checks if device is live
export const getDeviceStatus = async (req, res) => {
    try {
        const now = Date.now();
        // If we haven't received a heartbeat in 10 seconds, it's Offline
        const timeSinceLastHeartbeat = now - lastHeartbeatTime;
        const deviceOnline = timeSinceLastHeartbeat < 10000;

        res.json({ deviceOnline });
    } catch (error) {
        console.error('Device Status Check Error:', error.message);
        res.status(500).json({ deviceOnline: false, message: 'Error checking status' });
    }
};

// 4. App checks what the gauge reading is and if a fall happened
export const getFallStatus = async (req, res) => {
    try {
        const userId = req.user?.id;

        // 4a. Check actual heartbeat online connection
        const now = Date.now();
        const deviceOnline = (now - lastHeartbeatTime) < 10000;

        let statusString = currentGaugeStatus;
        if (!deviceOnline) {
            statusString = 'Offline';
            activeFallAlert = false; // Safe reset if device forcefully dies
        }

        const fallDetected = activeFallAlert;

        // 4b. If someone fell, log it to Postgres and then quickly turn the alert OFF so we don't spam 
        if (fallDetected && userId) {
            await prisma.fallEvent.create({
                data: {
                    user_id: userId,
                    detected: true,
                    status: 'pending'
                }
            });
            activeFallAlert = false; // Reset to wait for the next real fall
        }

        // 4c. Catchall for guest mode resetting
        if (fallDetected && !userId) {
            activeFallAlert = false;
        }

        res.json({ fallDetected, statusString });
    } catch (error) {
        console.error('Get Fall Status Error:', error.message);
        res.status(500).json({ message: 'Error fetching device fall status' });
    }
};
