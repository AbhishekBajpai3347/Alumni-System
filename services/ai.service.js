const axios = require('axios');

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

const EXTRACTION_SYSTEM_PROMPT = `You are a requirement-extraction assistant for an alumni search system.
Given a student's free-text description of the kind of alumnus they are looking for,
extract ONLY the following JSON object and nothing else (no markdown, no commentary):

{
  "interests": string[],
  "skills": string[],
  "job_roles": string[],
  "location": string[],
  "graduation_year": number|null,
  "branch": string|null,
  "experience": number|null,
  "other_requirements": string[]
}

Rules:
- Only include information explicitly present or clearly implied in the query.
- Never invent alumni names, companies, or facts.
- If a field is not mentioned, use an empty array or null as appropriate.
- Respond with raw JSON only.`;

/**
 * Calls Groq's chat completion API to turn a natural-language student query
 * into the structured JSON described in section 5 of the spec.
 * Throws if Groq is unavailable -- callers must handle this and surface a
 * clear error instead of fabricating results (section 23 of spec).
 */
async function extractStructuredRequirements(userQuery) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const response = await axios.post(
    GROQ_URL,
    {
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
        { role: 'user', content: userQuery },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    }
  );

  const raw = response.data.choices[0].message.content;
  const parsed = JSON.parse(raw);

  return {
    interests: parsed.interests || [],
    skills: parsed.skills || [],
    job_roles: parsed.job_roles || [],
    location: parsed.location || [],
    graduation_year: parsed.graduation_year ?? null,
    branch: parsed.branch ?? null,
    experience: parsed.experience ?? null,
    other_requirements: parsed.other_requirements || [],
  };
}

/**
 * Builds a short, human-readable "why they matched" explanation. Uses Groq
 * if available; falls back to a simple templated explanation if Groq is
 * down, so the AI Finder degrades gracefully rather than failing outright.
 */
async function explainMatch(studentQuery, alumnusSummary) {
  if (!process.env.GROQ_API_KEY) {
    return `Matched based on overlapping skills, interests, or role with your query.`;
  }
  try {
    const response = await axios.post(
      GROQ_URL,
      {
        model: GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'In one short sentence (max 25 words), explain why this alumnus is a good match for the student query. Be specific and factual, using only the provided alumnus summary. Do not invent facts.',
          },
          {
            role: 'user',
            content: `Student query: "${studentQuery}"\nAlumnus summary: ${alumnusSummary}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 60,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );
    return response.data.choices[0].message.content.trim();
  } catch (err) {
    return `Matched based on overlapping skills, interests, or role with your query.`;
  }
}

module.exports = { extractStructuredRequirements, explainMatch };
