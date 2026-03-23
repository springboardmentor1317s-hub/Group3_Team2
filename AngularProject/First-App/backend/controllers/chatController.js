const { GoogleGenerativeAI } = require('@google/generative-ai');

// Default key or placeholder
const apiKey = process.env.GEMINI_API_KEY || 'AIzaSy_YOUR_API_KEY_HERE';

// Standard initialization for the new SDK
const ai = new GoogleGenerativeAI(apiKey);

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
    If the user asks about logging in or registering (especially if they are a 'guest'), provide clear, step-by-step instructions. For example:
    Register: 1. Click 'Sign Up' 2. Fill in your details (Role, College, etc.) 3. Click 'Create Account'.
    Login: 1. Click 'Login' 2. Enter your email and password 3. Click 'Login'.
    The user asking this question is logged in as a: ${role || 'guest'}.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: message,
            config: {
                systemInstruction: systemInstruction,
            }
        });

        res.status(200).json({ reply: response.text });
    } catch (error) {
        console.error('Gemini API Error:', error);
        res.status(500).json({ message: 'Failed to generate response', error: error.message });
    }
};
