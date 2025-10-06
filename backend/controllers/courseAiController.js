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
    const prompt = `You are an expert academic advisor with deep knowledge of online courses. A student from ${department} department wants to learn about: ${subjects}.

Provide EXACTLY 5 real, popular online courses that actually exist. For each course, return:
- "course": The exact course title as it appears on the platform
- "description": A brief, accurate description (50-100 words)
- "instructor": The actual instructor or institution name
- "platform": The platform (Coursera, Udemy, edX, Khan Academy, etc.)
- "rating": Course rating if known (e.g., "4.7/5")
- "duration": Approximate course duration (e.g., "40 hours", "6 weeks")

Focus on highly-rated, comprehensive courses that match the subjects. Include a mix of beginner and intermediate level courses.

Return ONLY a JSON array, no other text. Example format:
[
  {
    "course": "Machine Learning",
    "description": "Stanford's famous ML course by Andrew Ng covering supervised and unsupervised learning",
    "instructor": "Andrew Ng",
    "platform": "Coursera",
    "rating": "4.9/5",
    "duration": "60 hours"
  }
]`;

    // Define fallback model list with better free-tier models
    const models = [
      'google/gemini-2.0-flash-exp:free',  // Good for structured output
      'qwen/qwen-2.5-72b-instruct:free',   // Excellent for instructions
      'meta-llama/llama-3.2-3b-instruct:free', // Fast and reliable
      'mistralai/mistral-small-3.1-24b:free',  // Good general purpose
      'bytedance/yi-1.5-16k-chat:free',    // Good for detailed responses
      'z-ai/glm-4-32b:free'                // Alternative option
    ];

    let aiMessage = '';
    for (const mdl of models) {
      try {
        const response = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: mdl,
            messages: [
              { 
                role: 'system', 
                content: 'You are an expert educational consultant with comprehensive knowledge of online learning platforms including Coursera, Udemy, edX, Khan Academy, and others. You provide accurate, specific course recommendations based on real courses that exist on these platforms. Always return valid JSON arrays.' 
              },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,  // More consistent output
            max_tokens: 2048,  // Enough for detailed responses
            top_p: 0.9
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
          console.warn(`Model ${mdl} rate-limited, trying next model...`);
          continue; // fallback
        }
        console.error(`Error with model ${mdl}:`, err.response?.data || err.message);
        continue; // Try next model instead of throwing
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

      // Simple direct link generation based on platform and course name
      const generateCourseLink = (courseName, platform) => {
        const slug = courseName.toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
          .replace(/\s+/g, '-') // Replace spaces with hyphens
          .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
          .trim();

        switch (platform.toLowerCase()) {
          case 'coursera':
            // Coursera URLs are typically /learn/course-name or /specializations/course-name
            return `https://www.coursera.org/search?query=${encodeURIComponent(courseName)}`;
          case 'udemy':
            // Udemy search URL
            return `https://www.udemy.com/courses/search/?q=${encodeURIComponent(courseName)}`;
          case 'edx':
            return `https://www.edx.org/search?q=${encodeURIComponent(courseName)}`;
          case 'khan academy':
            return `https://www.khanacademy.org/search?referer=%2F&page_search_query=${encodeURIComponent(courseName)}`;
          default:
            // Fallback to Google search
            return `https://www.google.com/search?q=${encodeURIComponent(courseName + ' online course ' + platform)}`;
        }
      };

      const withLinks = structured.map((rec) => {
        const title = rec.course || rec.title || rec.name;
        if (!title) return null;

        // Use the platform from AI response or default to searching
        const platform = rec.platform || 'Coursera';
        const link = generateCourseLink(title, platform);
        
        return {
          ...rec,
          course: title,
          link: link,
          platform: platform
        };
      });

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
