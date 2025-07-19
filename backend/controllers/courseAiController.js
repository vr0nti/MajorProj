const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();
const { Groq } = require('groq-sdk');

/**
 * POST /api/course-ai/recommend
 * Body: { department: string, subjects: string }
 */
const recommendCourses = async (req, res) => {
  const { department, subjects } = req.body;

  if (!department || !subjects) {
    return res.status(400).json({ error: 'Department and subjects are required.' });
  }

  try {
    const prompt = `You are an academic advisor. The student is in the ${department} department and has interest in the following subjects: ${subjects}. Return EXACTLY 5 courses that would be suitable for online learning. Mix both comprehensive courses and specific topic courses. If you cannot find 5 courses matching the subjects exactly, add additional courses that are generally relevant to the ${department} department. For each course provide: 1) course (name) - be specific and include keywords like "Complete", "Full", "Comprehensive" where appropriate and 2) description. Do NOT provide any links. OUTPUT STRICTLY a JSON array`;

    // Define fallback model list
    const models = [
      'google/gemini-2.0-flash-exp:free',
      'moonshotai/kimi-dev-72b:free',
      'microsoft/mai-ds-r1:free',
      'nvidia/llama-3.1-nemotron-ultra-253b-v1:free',
    ];

    let aiMessage = '';
    for (const mdl of models) {
      try {
        const response = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: mdl,
            messages: [
              { role: 'system', content: 'You are a helpful assistant providing course recommendations.' },
              { role: 'user', content: prompt }
            ]
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );
        aiMessage = response.data.choices?.[0]?.message?.content || '';
        if (aiMessage) break; // success
      } catch (err) {
        const providerCode = err.response?.data?.error?.code ?? err.response?.status;
        if (providerCode === 429) {
          console.warn(`Model ${mdl} rate-limited, trying next model…`);
          continue; // fallback
        }
        throw err; // other errors => bubble
      }
    }

    if (!aiMessage) {
      // Try Groq as final fallback
      try {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const groqRes = await groq.chat.completions.create({
          model: 'compound-beta-mini',
          messages: [
            { role: 'system', content: 'You are a helpful assistant providing course recommendations.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.8,
          max_tokens: 1024,
          top_p: 1
        });
        aiMessage = groqRes.choices?.[0]?.message?.content || '';
      } catch (groqErr) {
        console.error('Groq fallback failed:', groqErr.response?.data || groqErr.message);
      }
    }

    if (!aiMessage) {
      return res.status(503).json({ error: 'All free models are currently rate-limited. Please retry shortly.' });
    }

    let structured;
    try {
      structured = JSON.parse(aiMessage);
    } catch (_) {
      // Attempt to extract JSON inside markdown fences
      const match = aiMessage.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (match) {
        try {
          structured = JSON.parse(match[1]);
        } catch (e) {
          structured = aiMessage; // still fallback
        }
      } else {
        structured = aiMessage;
      }
    }

    if (Array.isArray(structured)) {
      // helper functions
      const SIMILARITY_THRESHOLD = 0.7;

      const score = (original, candidate) => {
        const aw = original.toLowerCase().split(/\s+/);
        const bw = candidate.toLowerCase().split(/\s+/);
        const overlap = aw.filter(x => bw.includes(x)).length;
        return overlap / Math.max(aw.length, bw.length);
      };

      const searchCoursera = async (title) => {
        try {
          const url = `https://www.coursera.org/search?query=${encodeURIComponent(title)}`;
          const { data: html } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 });
          const $ = cheerio.load(html);
          const anchors = [];
          $('a[href^="/learn/"], a[href^="/specializations/"]').each((i, el) => {
            const href = $(el).attr('href');
            const text = $(el).find('h2').text().trim() || $(el).attr('aria-label') || '';
            if (href && text) anchors.push({ href, text });
          });
          anchors.sort((a, b) => score(title, b.text) - score(title, a.text));
          if (anchors[0] && score(title, anchors[0].text) >= SIMILARITY_THRESHOLD) {
            return `https://www.coursera.org${anchors[0].href}`;
          }
          // loose fallback: first anchor regardless
          if (anchors[0]) return `https://www.coursera.org${anchors[0].href}`;
        } catch (e) { /* ignore */ }
        return null;
      };

      const searchWeb = async (title) => {
        try {
          const query = encodeURIComponent(`${title} online course`);
          const url = `https://duckduckgo.com/html/?q=${query}`;
          const { data: html } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 });
          const $ = cheerio.load(html);
          const first = $('a.result__a').first();
          if (first && first.attr('href')) {
            return first.attr('href');
          }
        } catch (_) {}
        return null;
      };

      const withLinks = await Promise.all(
        structured.map(async (rec) => {
          const title = rec.course || rec.title || rec.name;
          if (!title) return null;

          // Try Coursera first (max 3)
          const courseraLink = await searchCoursera(title);
          if (courseraLink) {
            return { ...rec, link: courseraLink, platform: 'Coursera' };
          }

          // Fallback: generic web search result
          const webLink = await searchWeb(title);
          if (webLink) {
            return { ...rec, link: webLink, platform: 'Web' };
          }
          return null;
        })
      );

      const filtered = withLinks.filter(Boolean);
      const output = filtered.slice(0, 5);
      if (output.length > 0) {
        return res.json(output);
      }
    }

    res.json({ error: 'Could not obtain enough valid courses. Please try again.' });
  } catch (error) {
    console.error('Error calling OpenRouter API:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch recommendations.' });
  }
};

module.exports = { recommendCourses };
