const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = 'gemini-2.5-flash';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function generateContentWithRetry(options, maxRetries = 5, baseDelay = 15000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await ai.models.generateContent({
        model: MODEL_NAME,
        ...options
      });
    } catch (error) {
      if (error.message && error.message.includes('429')) {
        console.log(`    [Rate Limit Hit] Attempt ${attempt}/${maxRetries}. Sleeping for ${baseDelay / 1000}s...`);
        if (attempt === maxRetries) throw error;
        await sleep(baseDelay);
        baseDelay *= 2; // Exponential backoff
      } else {
        throw error; // Not a rate limit error
      }
    }
  }
}

module.exports = { generateContentWithRetry, sleep };
