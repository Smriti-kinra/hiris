require('dotenv').config()
const { generateContentWithRetry, parseJsonObject } = require('./utils')

function normalizeMatchOutput(raw) {
  const score = Number(raw.suitability_score)
  return {
    suitability_score: Number.isFinite(score) ? Math.max(0, Math.min(10, score)) : 0,
    rationale: String(raw.rationale || '').trim(),
  }
}

/**
 * Single LLM Baseline:
 * One prompt takes resume + JD and directly emits the final score/rationale.
 */
async function scoreResumeJobMatchSingleLLM(resumeText, jobDescription) {
  const prompt = `
You are a senior HR expert evaluating resume-to-job fit.

Return only JSON with:
{
  "suitability_score": number from 0 to 10,
  "rationale": "2-4 sentences explaining matched strengths and gaps"
}

Job Description:
${jobDescription}

Candidate Resume:
${resumeText}
`

  const response = await generateContentWithRetry({
    contents: prompt,
    config: { responseMimeType: 'application/json' },
  })
  return normalizeMatchOutput(parseJsonObject(response.text))
}

/**
 * Agentic Baseline:
 * Step 1: Extract JD requirements.
 * Step 2: Extract candidate evidence.
 * Step 3: Compare matches and gaps.
 * Step 4: Self-check the comparison before final scoring.
 */
async function scoreResumeJobMatchAgentic(resumeText, jobDescription) {
  const jdRequirements = await generateContentWithRetry({
    contents: `
Extract the job requirements as JSON.
Include hard skills, experience requirements, domain requirements, and nice-to-have signals.

Job Description:
${jobDescription}
`,
    config: { responseMimeType: 'application/json' },
  })

  const resumeEvidence = await generateContentWithRetry({
    contents: `
Extract candidate evidence as JSON.
Include skills, years of experience, domain exposure, shipped work, leadership, and explicit gaps.

Resume:
${resumeText}
`,
    config: { responseMimeType: 'application/json' },
  })

  const comparison = await generateContentWithRetry({
    contents: `
Compare the JD requirements against candidate evidence.
Return JSON with arrays: matched_requirements, partial_matches, missing_requirements, risk_flags.

JD Requirements:
${jdRequirements.text}

Candidate Evidence:
${resumeEvidence.text}
`,
    config: { responseMimeType: 'application/json' },
  })

  const finalResponse = await generateContentWithRetry({
    contents: `
You are the final scoring agent. Verify the comparison for unsupported claims, then score the candidate from 0 to 10.

Use this scoring guide:
- 9-10: Excellent fit with only minor gaps.
- 7-8: Good fit with manageable gaps.
- 4-6: Partial fit with meaningful gaps.
- 0-3: Weak fit for core role requirements.

Return only JSON with:
{
  "suitability_score": number from 0 to 10,
  "rationale": "2-4 sentences grounded only in the resume and JD",
  "self_check": "one sentence on whether the rationale avoids unsupported claims"
}

JD Requirements:
${jdRequirements.text}

Candidate Evidence:
${resumeEvidence.text}

Comparison:
${comparison.text}
`,
    config: { responseMimeType: 'application/json' },
  })

  return normalizeMatchOutput(parseJsonObject(finalResponse.text))
}

module.exports = {
  scoreResumeJobMatchSingleLLM,
  scoreResumeJobMatchAgentic,
}
