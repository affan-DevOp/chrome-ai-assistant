import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/ask', async (req, res) => {
  try {
    const pageText = req.body.pageText;
    const query = req.body.query;
    
    if (!pageText || !query) {
      return res.status(400).json({ error: 'Both pageText and query are required.' });
    }
    
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
    
    const masterPrompt = `
    You are an expert analytical assistant living inside a narrow Chrome Extension window (400px wide).
    Your goal is to extract information from the provided webpage text and format it perfectly for a sleek, mobile-style app interface.
    
    STRICT UI FORMATTING RULES:
    1. NO CONVERSATIONAL FILLER. Start immediately with the data.
    2. NO MARKDOWN TABLES. Tables break the narrow UI. Do not use them under any circumstances.
    3. Use "Card-style" formatting for categories, metrics, or definitions. Format them exactly like this:
       ▪ **Term/Category:** One short sentence explaining it.
    4. Keep everything incredibly brief. Limit sections to a maximum of 3 to 4 short bullet points.
    5. Use clean headings (###) to separate major sections.
    6. If the question asked is completely out of context from the page content, state that clearly.

    --- WEBPAGE TEXT CONTENT ---
    ${pageText}
    ----------------------------

    USER QUESTION: ${query}
    `;
    
    const result = await model.generateContent(masterPrompt);
    const responseText = result.response.text();

    res.json({ answer: responseText });
  } catch (error) {
    console.error('server error:', error);
    res.status(500).json({ error: 'An error occurred while processing the request.' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend is running! Listening on http://localhost:${PORT}`);
});