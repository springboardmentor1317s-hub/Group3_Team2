const { GoogleGenerativeAI } = require('@google/generative-ai');

// Default key or placeholder
const apiKey = process.env.GEMINI_API_KEY || 'AIzaSy_YOUR_API_KEY_HERE';
const genAI = new GoogleGenerativeAI(apiKey);

exports.askGemini = async (req, res) => {
    try {
        const { message, role } = req.body;
        if (!message) {
            return res.status(400).json({ message: 'Message is required' });
        }

        // System instructions to guide the bot's persona
        const systemInstruction = `You are a helpful, friendly, and concise chatbot assistant for the "Campus Event Hub" platform. 
    You help students and college administrators manage, discover, and organize college events.
    Keep your answers short (under 3 sentences) and formatted cleanly for a chat window. 
    Do not use complex markdown, but bolding and emojis are encouraged.
    The user asking this question is logged in as a: ${role || 'guest'}.`;

        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            systemInstruction: systemInstruction
        });

        const result = await model.generateContent(message);
        const responseText = result.response.text();

        res.status(200).json({ reply: responseText });
    } catch (error) {
        console.error('Gemini API Error:', error);
        res.status(500).json({ message: 'Failed to generate response', error: error.message });
    }
};
