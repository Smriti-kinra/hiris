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

  const prompt = `You are a senior HR evaluator and organizational psychologist conducting a rigorous behavioral interview assessment for an academic institution. Your role is to be a fair but CRITICAL evaluator — not a cheerleader. Your scores must reflect actual demonstrated evidence, not potential, politeness, or effort.

---

## CANDIDATE: "${candidateName}"

## INTERVIEW TRANSCRIPT:
${transcript}

## CANDIDATE RESUME:
${resumeText || 'No resume provided.'}

## INSTITUTIONAL VALUES:
${valuesText || 'No institutional values provided.'}

---

## SCORING SYSTEM — READ CAREFULLY BEFORE SCORING

You MUST use the full 1–10 range. Scores of 7–10 must be EARNED with specific, concrete evidence from the transcript. Do NOT default to 6–8 out of politeness or because the candidate "seemed nice."

### Score Reference Scale:
- **9–10 (Exceptional):** Candidate gave a detailed, structured, specific example (using STAR or equivalent), demonstrated measurable impact, showed deep self-awareness, and went beyond what was asked. This is rare.
- **7–8 (Proficient):** Candidate gave a clear, relevant example with reasonable detail, showed understanding of the concept, and answered the question fully. Minor gaps allowed.
- **5–6 (Adequate):** Candidate gave a vague or partially relevant answer. The example lacked specificity, impact was unclear, or the answer was surface-level. Raises mild concerns.
- **3–4 (Weak):** Candidate struggled to provide a concrete example, gave a hypothetical instead of a real situation, deflected, or showed limited understanding of the trait.
- **1–2 (Poor):** Candidate failed to answer meaningfully, gave contradictory information, or demonstrated behaviors contrary to the trait being evaluated.

### MANDATORY DEDUCTION RULES — Apply these automatically:
- **No concrete example given** (candidate spoke in hypotheticals or generalities): DEDUCT 2–3 points
- **Inconsistency with resume** (claims not supported by or contradicted by resume): DEDUCT 2 points
- **Short or evasive answers** (candidate redirected, gave one-liners, or avoided the question): DEDUCT 2 points
- **No measurable outcome or impact described** (e.g., "I helped the team" with no result): DEDUCT 1–2 points
- **Negative self-awareness signals** (blaming others, no lessons learned, no reflection): DEDUCT 2 points
- **Generic buzzwords without substance** (e.g., "I'm a team player", "I always communicate well" with no example): DEDUCT 1–2 points

---

## TRAITS TO EVALUATE

Evaluate each of the following 13 traits. For each one:
1. Identify the specific moment(s) in the transcript that informed your score.
2. Apply the deduction rules where applicable.
3. Give a score grounded in evidence, not impression.

**Traits:** Emotional Intelligence, Collaboration, Integrity, Ownership, Cultural Alignment, Decision Making, Conflict Resolution, Institutional Values Alignment, Professionalism, Growth Mindset

---

## SCORING CALIBRATION EXAMPLES

### Communication:
- Score 9: Candidate said: "I noticed our weekly reports were being misread by leadership, so I restructured them into a one-page executive summary with a traffic-light status system. Feedback errors dropped by 40% in one quarter." → Specific situation, concrete action, measurable outcome.
- Score 5: Candidate said: "I think communication is really important. I always try to be clear and transparent with my team." → Pure generality, no example, no impact.
- Score 3: Candidate said: "I'm not the most talkative person but I do communicate when needed." → Minimizes the trait, no example, passive framing.

### Leadership:
- Score 8: Candidate said: "When our project lead left mid-project, I stepped in, reorganized task assignments based on everyone's strengths, and we delivered on time though we had to cut two minor features." → Real scenario, initiative shown, honest about tradeoffs.
- Score 4: Candidate said: "I've led small groups in college projects. I usually make sure everyone has a task." → Vague, no impact, no real challenge.

### Conflict Resolution:
- Score 7: Candidate said: "Two team members disagreed on database structure. I set up a 30-minute session where each explained their rationale and we evaluated both against our performance requirements and picked a hybrid." → Real conflict, structured resolution, outcome described.
- Score 3: Candidate said: "I try to avoid conflict and prefer to keep things professional." → Conflict avoidance is NOT conflict resolution. Red flag.

---

## RECOMMENDATION CRITERIA

- **strong_hire:** Average trait score ≥ 7.5, no trait below 5, strong concrete examples throughout, clear institutional alignment.
- **hire:** Average trait score 6.5–7.4, at most 2 traits below 5, generally solid with minor gaps.
- **neutral:** Average trait score 5.5–6.4, OR 3+ traits below 5, OR significant gaps in evidence or value alignment.
- **no_hire:** Average trait score < 5.5, OR multiple red flags such as evasiveness, value misalignment, inability to give examples, or resume contradictions.

---

## OUTPUT FORMAT

Return ONLY a raw JSON object. No markdown. No code fences. No preamble or explanation outside the JSON. The "comments" for each trait must reference actual transcript evidence — do not write generic justifications.

{
  "traits": [
    {"name": "Communication", "score": 6, "comments": "Justification grounded in specific transcript evidence, deductions noted inline"},
    ...
  ],
  "summary": "2–3 paragraph behavioral analysis. Be specific. Reference actual transcript moments. Do not generalize or praise vaguely.",
  "institutional_alignment": "Specific analysis of alignment or misalignment with the stated institutional values, with transcript references.",
  "strengths": ["Specific strength with transcript evidence", "..."],
  "concerns": ["Specific concern with transcript evidence", "..."],
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

/**
 * Generate candidate application summary
 */
async function generateApplicationSummary(resumeText, cvText, chatAnswers, candidateName) {
  console.log(`[GEMINI] Generating application summary for: ${candidateName}`)
  const prompt = `You are an expert HR evaluator.

Candidate Name: ${candidateName}

Candidate Resume:
${resumeText || 'No resume provided.'}

Candidate CV:
${cvText || 'No CV provided.'}

Candidate Application/AI Chat Answers:
${JSON.stringify(chatAnswers, null, 2)}

Provide a detailed summary of this application, including:
- candidate overview
- motivations
- strengths
- institutional alignment indicators
- communication indicators
- overall impression

Return ONLY plain text or simple markdown formatting. Do not wrap in JSON.`

  const result = await generateWithFallback(prompt)
  return result.response.text().trim()
}

module.exports = { generateBehavioralQuestions, evaluateBehavioralInterview, generateApplicationSummary }
