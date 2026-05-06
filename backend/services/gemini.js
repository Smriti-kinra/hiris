/**
 * gemini.js — Gemini API integration service for HIRIS.
 *
 * Uses the @google/generative-ai SDK to:
 *   1. Generate candidate-specific behavioral interview questions.
 *   2. Evaluate interview transcripts against behavioral traits.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai')

// Models to try in order (fallback chain — verified via ListModels API)
const MODEL_CHAIN = [
  'gemini-3.1-flash-lite-preview',   // User-requested primary model
  'gemini-2.5-flash-lite',           // Fallback 1
  'gemini-2.0-flash-lite',           // Fallback 2
  'gemini-2.0-flash',                // Fallback 3
  'gemini-1.5-flash',                // Fallback 4 (Stable)
  'gemini-1.5-pro',                  // Fallback 5 (Powerful)
]

function getModel(modelName) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set in environment.')
  const genAI = new GoogleGenerativeAI(apiKey)
  return genAI.getGenerativeModel({ model: modelName || MODEL_CHAIN[0] })
}

/**
 * Try generating content with model fallback chain.
 */
async function generateWithFallback(prompt) {
  let lastError = null
  for (const modelName of MODEL_CHAIN) {
    try {
      console.log(`[GEMINI] Trying model: ${modelName}`)
      const model = getModel(modelName)
      
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Gemini API timeout')), 30000))
      const result = await Promise.race([model.generateContent(prompt), timeoutPromise])
      
      console.log(`[GEMINI] Success with model: ${modelName}`)
      return result
    } catch (err) {
      lastError = err
      const isRateLimit = err.status === 429 || err.message?.includes('429') || err.message?.includes('timeout')
      console.warn(`[GEMINI] ${modelName} failed: ${isRateLimit ? 'rate limited or timeout' : err.message}`)
      if (!isRateLimit && !err.message?.includes('timeout')) throw err // Only retry on rate limits or timeouts
    }
  }
  throw lastError
}

/**
 * Generate 10 contextual behavioral interview questions.
 *
 * @param {string} resumeText  - Extracted text from the candidate's resume.
 * @param {string} cvText      - Extracted text from the candidate's CV.
 * @param {string} valuesText  - Extracted text from the institutional values PDF.
 * @param {string} candidateName
 * @returns {Promise<string[]>} Array of 10 question strings.
 */
async function generateBehavioralQuestions(resumeText, cvText, valuesText, candidateName) {
  console.log(`[GEMINI] Generating questions for candidate: ${candidateName}`)
  console.log(`[GEMINI] Resume text length: ${resumeText.length}, CV text length: ${cvText.length}, Values text length: ${valuesText.length}`)

  const prompt = `You are an expert HR interviewer at an academic institution.

You have:
1. The candidate's RESUME:
${resumeText || 'No resume text available.'}

2. The candidate's CV:
${cvText || 'No CV text available.'}

3. The institution's VALUES DOCUMENT:
${valuesText || 'No institutional values document available.'}

Candidate name: ${candidateName}

Generate exactly 10 behavioral/CHRO interview questions that are:
- Specific to this candidate's background and experience
- Aligned with the institutional values described above
- Professional, non-generic, and probing
- Focused on: leadership, cultural alignment, integrity, adaptability, emotional intelligence, collaboration, ownership, decision making, conflict resolution, and growth mindset

Return ONLY a JSON array of 10 strings. No markdown, no explanation, no code fences. Example:
["Question 1?", "Question 2?", ...]`

  const result = await generateWithFallback(prompt)
  const text = result.response.text().trim()

  console.log(`[GEMINI] Raw response length: ${text.length}`)

  // Parse the JSON array from the response
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
  try {
    const questions = JSON.parse(cleaned)
    if (Array.isArray(questions)) {
      console.log(`[GEMINI] Successfully parsed ${questions.length} questions`)
      return questions.slice(0, 10)
    }
  } catch (parseErr) {
    console.error(`[GEMINI] JSON parse failed, falling back to line split: ${parseErr.message}`)
    // Fallback: split by newlines if JSON parsing fails
    const lines = text.split('\n')
      .map(l => l.replace(/^\d+\.\s*/, '').replace(/^["']\s*/, '').replace(/\s*["'],?$/, '').trim())
      .filter(l => l.length > 10 && l.endsWith('?'))
    if (lines.length > 0) return lines.slice(0, 10)
  }
  return []
}

/**
 * Evaluate a behavioral interview transcript using Gemini.
 *
 * @param {string} transcript       - Full interview transcript text.
 * @param {string} resumeText       - Candidate resume content.
 * @param {string} valuesText       - Institutional values text.
 * @param {string} candidateName
 * @returns {Promise<Object>} AI evaluation with traits, summary, recommendation.
 */
async function evaluateBehavioralInterview(transcript, resumeText, valuesText, candidateName) {

  console.log(`[GEMINI] Evaluating behavioral interview for: ${candidateName}`)
  console.log(`[GEMINI] Transcript length: ${transcript.length}`)

  const prompt = `You are an expert HR evaluator at an academic institution.

You have the following interview transcript between an interviewer and candidate "${candidateName}":

${transcript}

Candidate resume context:
${resumeText || 'No resume context available.'}

Institutional values:
${valuesText || 'No institutional values available.'}

Evaluate the candidate on each of the following behavioral traits on a scale of 1 to 10:
- Communication
- Leadership
- Adaptability
- Emotional Intelligence
- Collaboration
- Integrity
- Ownership
- Cultural Alignment
- Decision Making
- Conflict Resolution
- Institutional Values Alignment
- Professionalism
- Growth Mindset

Return a JSON object (no markdown, no code fences) with this exact structure:
{
  "traits": [
    {"name": "Communication", "score": 8, "comments": "Brief justification"},
    ...
  ],
  "summary": "Overall behavioral analysis paragraph",
  "institutional_alignment": "How well the candidate aligns with institutional values",
  "strengths": ["strength 1", "strength 2"],
  "concerns": ["concern 1"],
  "recommendation": "strong_hire | hire | neutral | no_hire"
}`

  const result = await generateWithFallback(prompt)
  const text = result.response.text().trim()
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()

  console.log(`[GEMINI] Evaluation response length: ${cleaned.length}`)

  try {
    const parsed = JSON.parse(cleaned)
    console.log(`[GEMINI] Evaluation parsed successfully. Recommendation: ${parsed.recommendation}`)
    return parsed
  } catch (parseErr) {
    console.error(`[GEMINI] Evaluation JSON parse failed: ${parseErr.message}`)
    return { traits: [], summary: text, recommendation: 'neutral', strengths: [], concerns: [], institutional_alignment: '' }
  }
}

module.exports = { generateBehavioralQuestions, evaluateBehavioralInterview }
