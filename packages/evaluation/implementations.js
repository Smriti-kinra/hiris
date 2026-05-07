require('dotenv').config();
const { generateContentWithRetry } = require('./utils');

/**
 * 1. Single Prompt Baseline
 * Passes the JD and Resume in one go and asks for a score and summary.
 */
async function scoreCandidateBaseline(jd, resume) {
  const prompt = `
You are an expert technical recruiter. You need to screen a candidate's resume against a job description.
Provide a fit score from 0 to 100, and a brief 2-3 sentence summary explaining the reasoning.

Job Description:
${jd}

Candidate Resume:
${resume}

Return the result STRICTLY as a JSON object with the exact keys "score" (number) and "summary" (string).
`;

  try {
    const response = await generateContentWithRetry({
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Baseline API Error:", error);
    return { score: 0, summary: "Error generating evaluation." };
  }
}

/**
 * 2. Agentic Baseline
 * Multi-step process:
 * Step 1: Extract key requirements from the JD.
 * Step 2: Extract skills/experience from Resume.
 * Step 3: Compare and score.
 */
async function scoreCandidateAgentic(jd, resume) {
  try {
    // Step 1: Analyze JD
    const jdExtractionPrompt = `Extract the hard requirements, skills, and experience needed from this job description as a bulleted list:\n\n${jd}`;
    const jdResp = await generateContentWithRetry({ contents: jdExtractionPrompt });
    const jdRequirements = jdResp.text;

    // Step 2: Analyze Resume
    const resumeExtractionPrompt = `Extract the skills, years of experience, and key accomplishments from this resume as a bulleted list:\n\n${resume}`;
    const resumeResp = await generateContentWithRetry({ contents: resumeExtractionPrompt });
    const candidateProfile = resumeResp.text;

    // Step 3: Judge Fit
    const finalPrompt = `
You are an expert technical recruiter. Compare the Job Requirements with the Candidate Profile.
Provide a fit score from 0 to 100, and a 2-3 sentence summary explaining the reasoning based strictly on the comparison.

Job Requirements:
${jdRequirements}

Candidate Profile:
${candidateProfile}

Return the result STRICTLY as a JSON object with the exact keys "score" (number) and "summary" (string).
`;

    const finalResp = await generateContentWithRetry({
      contents: finalPrompt,
      config: { responseMimeType: "application/json" }
    });

    return JSON.parse(finalResp.text);
  } catch (error) {
    console.error("Agentic API Error:", error);
    return { score: 0, summary: "Error generating evaluation." };
  }
}

module.exports = {
  scoreCandidateBaseline,
  scoreCandidateAgentic
};
