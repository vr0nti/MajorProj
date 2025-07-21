require('dotenv').config();
const { Groq } = require('groq-sdk');

/**
 * POST /api/academic-chat/ask
 * Body: { prompt: string }
 */
const askDoubtSolver = async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  try {
    const systemInstruction = `You are an AI academic doubt-solving assistant. ONLY answer questions related to academics (subjects, courses, assignments, exams, etc.). If the question is non-academic, politely refuse with a short response. Keep answers concise, clear, and student-friendly.`;

    let aiMessage = '';
    try {
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const groqRes = await groq.chat.completions.create({
        model: 'compound-beta-mini',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1024,
        top_p: 1,
      });
      aiMessage = groqRes.choices?.[0]?.message?.content || '';
    } catch (groqErr) {
      console.error('Groq request failed:', groqErr.response?.data || groqErr.message);
      return res.status(503).json({ error: 'AI service unavailable. Please try again later.' });
    }

    return res.json({ answer: aiMessage.trim() });
  } catch (error) {
    console.error('Error in academic doubt solver:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to get answer.' });
  }
};

module.exports = { askDoubtSolver };