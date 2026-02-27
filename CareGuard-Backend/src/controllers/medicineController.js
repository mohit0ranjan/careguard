import prisma from '../utils/db.js';
import Groq from 'groq-sdk';
import axios from 'axios';
import FormData from 'form-data';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });


export const getMedicines = async (req, res) => {
    if (!req.user) {
        return res.json([]); // Guests get no medicines from cloud
    }

    try {
        const medicines = await prisma.medicine.findMany({
            where: { user_id: req.user.id }
        });
        res.json(medicines);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const addMedicine = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Guest users cannot save medicine online.' });
    }

    const { name, time, frequency } = req.body;

    try {
        const newMedicine = await prisma.medicine.create({
            data: {
                user_id: req.user.id,
                name,
                time,
                frequency,
                taken: false
            }
        });
        res.status(201).json(newMedicine);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const updateMedicine = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Not authorized' });
    }

    const { id } = req.params;
    const { taken } = req.body;

    try {
        const minCheck = await prisma.medicine.findUnique({ where: { id } });
        if (!minCheck || minCheck.user_id !== req.user.id) {
            return res.status(404).json({ message: 'Not authorized or Not found' });
        }

        const updatedMed = await prisma.medicine.update({
            where: { id },
            data: { taken }
        });
        res.json(updatedMed);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const deleteMedicine = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Not authorized' });
    }

    const { id } = req.params;

    try {
        const minCheck = await prisma.medicine.findUnique({ where: { id } });
        if (!minCheck || minCheck.user_id !== req.user.id) {
            return res.status(404).json({ message: 'Not authorized or Not found' });
        }

        await prisma.medicine.delete({ where: { id } });
        res.json({ message: 'Medicine Removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const explainMedicine = async (req, res) => {
    const { medicineName, imageBase64 } = req.body;

    if (!medicineName && !imageBase64) {
        return res.status(400).json({ message: 'Medicine name or image is required.' });
    }

    let detectedName = medicineName;

    // Use fast cloud OCR if an image was provided
    if (imageBase64) {
        try {
            console.log("Analyzing image with cloud OCR...");
            const form = new FormData();
            form.append('base64Image', `data:image/jpeg;base64,${imageBase64}`);
            form.append('apikey', 'helloworld');
            form.append('OCREngine', '2'); // Engine 2 is dramatically better for photos and bad lighting
            form.append('scale', 'true'); // Auto-scales the photo to make text bigger before reading

            const ocrResponse = await axios.post('https://api.ocr.space/parse/image', form, {
                headers: form.getHeaders(),
                timeout: 15000
            });

            if (ocrResponse.data && ocrResponse.data.ParsedResults && ocrResponse.data.ParsedResults.length > 0) {
                detectedName = ocrResponse.data.ParsedResults[0].ParsedText.trim();
                console.log("Extracted text:", detectedName);
            } else {
                throw new Error("No text found");
            }
        } catch (ocrError) {
            console.error("OCR Error:", ocrError.message || ocrError);
            return res.status(500).json({ message: 'Could not extract text from the image. Ensure the image is clear or try typing it.' });
        }
    }

    const basePrompt = `You are a medical assistant AI designed to help users understand medicines in a very simple and safe way.

A user has scanned a medicine. Your job is to explain it clearly based on this scanned text:

Scanned Medicine Text: ${detectedName}

Instructions:
- Use VERY simple language (easy for elderly users)
- Keep sentences short and clear
- Avoid medical jargon
- Ignore random OCR noise/letters/numbers in the scanned text. Deduce the primary medicine name even if there are typos (e.g., if you see "D0l0", assume "Dolo").
- Look for common active ingredients or brand names in the text provided.
- Be accurate but easy to understand
- If there is absolutely no recognizable medicine name or active ingredient in the text, say "Please consult a doctor"

Provide response in the following structured format (use the identified medicine name):

Medicine: <name>

Uses:
- <what it is used for>

How to Take:
- <dosage guidance in general terms, not exact prescription>

Side Effects:
- <common side effects>

Warnings:
- <who should avoid it / precautions>

Emergency:
- <when to seek immediate help>

Output Rules:
- Do NOT give exact prescription dosage
- Do NOT act like a doctor
- Keep response under 120 words
- Always include this line at the end:

"⚠️ This is general information. Please consult a doctor before use."`;

    try {
        const completion = await groq.chat.completions.create({
            model: "openai/gpt-oss-120b", // User-requested model
            messages: [
                {
                    role: "user",
                    content: basePrompt
                }
            ],
            temperature: 0.5,
            max_completion_tokens: 1024, // GPT-OSS-120b handles strings
            top_p: 1,
            stream: false,
        });

        res.json({ explanation: completion.choices[0].message.content });
    } catch (error) {
        console.error("Groq API Error:", error.message || error);
        res.status(500).json({ message: 'Error explaining medicine details.' });
    }
};
