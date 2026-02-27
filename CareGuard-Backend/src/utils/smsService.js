import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

let client = null;
if (accountSid && authToken && accountSid.startsWith('AC')) {
    client = twilio(accountSid, authToken);
}

/**
 * Sends a fall alert to the configured phone numbers via WhatsApp or SMS.
 * 
 * @param {string} message - The alert message to send
 */
export const sendFallAlert = async (message = '🚨 URGENT: A fall has been detected! Please check on the person immediately.') => {
    if (!client) {
        console.warn('Twilio client is not initialized. Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN in .env. Skipping SMS/WhatsApp alert.');
        return;
    }

    // Comma-separated list of numbers to alert, from .env
    const numbersToAlert = process.env.ALERT_RECIPIENT_NUMBERS
        ? process.env.ALERT_RECIPIENT_NUMBERS.split(',').map(n => n.trim())
        : [];

    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
    const isWhatsApp = process.env.TWILIO_USE_WHATSAPP === 'true'; // Set to true to use WhatsApp

    if (numbersToAlert.length === 0 || !twilioPhone) {
        console.warn('Missing ALERT_RECIPIENT_NUMBERS or TWILIO_PHONE_NUMBER in .env.');
        return;
    }

    try {
        for (const number of numbersToAlert) {
            const to = isWhatsApp ? `whatsapp:${number}` : number;
            const from = isWhatsApp ? `whatsapp:${twilioPhone}` : twilioPhone;

            await client.messages.create({
                body: message,
                from: from,
                to: to
            });
            console.log(`Alert successfully sent to ${to}`);
        }
    } catch (error) {
        console.error('Failed to send Twilio alert:', error.message);
    }
};
