require('dotenv').config();
const fs = require('fs');
const { scoreCandidateBaseline, scoreCandidateAgentic } = require('./implementations');
const { generateContentWithRetry, sleep } = require('./utils');

async function judgeOutput(modelOutput, groundTruth) {
  const prompt = `
You are an expert AI evaluator. Your job is to evaluate the output of an AI Candidate Screening system against a ground truth.

Ground Truth Expectations:
- Expected Score Range: ${groundTruth.expected_score_range[0]} to ${groundTruth.expected_score_range[1]}
- Expected Reasoning Keywords/Concepts: ${groundTruth.reasoning_keywords.join(', ')}

Model Output Under Evaluation:
- Score: ${modelOutput.score}
- Summary: ${modelOutput.summary}

Evaluate the Model Output based on two criteria:
1. Score Accuracy: Is the score reasonably close to or within the expected range? (Pass/Fail)
2. Reasoning Quality: Does the summary touch upon the expected reasoning concepts without hallucinating? (Pass/Fail)

Return the result STRICTLY as a JSON object with the following schema:
{
  "score_accuracy": "Pass" | "Fail",
  "reasoning_quality": "Pass" | "Fail",
  "feedback": "A 1 sentence explanation of your judgement."
}
`;

  try {
    const response = await generateContentWithRetry({
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Judge API Error:", error);
    return { score_accuracy: "Fail", reasoning_quality: "Fail", feedback: "Judge failed." };
  }
}

async function runEvaluation() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("❌ ERROR: GEMINI_API_KEY is not set in your environment.");
    console.error("Please export it or add it to evaluation/.env");
    process.exit(1);
  }

  const dataset = JSON.parse(fs.readFileSync('./dataset.json', 'utf8'));
  
  const results = {
    baseline: { scorePass: 0, reasoningPass: 0 },
    agentic: { scorePass: 0, reasoningPass: 0 }
  };

  console.log(`🚀 Starting Evaluation for ${dataset.length} cases...\\n`);

  for (let i = 0; i < dataset.length; i++) {
    const data = dataset[i];
    console.log(`--- Evaluating Case ${i + 1}: ${data.id} ---`);

    // Run Baseline
    console.log("  Running Baseline Prompt...");
    const baselineOut = await scoreCandidateBaseline(data.job_description, data.resume);
    const baselineJudge = await judgeOutput(baselineOut, data.ground_truth);
    if (baselineJudge.score_accuracy === 'Pass') results.baseline.scorePass++;
    if (baselineJudge.reasoning_quality === 'Pass') results.baseline.reasoningPass++;

    // Run Agentic
    console.log("  Running Agentic Workflow...");
    const agenticOut = await scoreCandidateAgentic(data.job_description, data.resume);
    const agenticJudge = await judgeOutput(agenticOut, data.ground_truth);
    if (agenticJudge.score_accuracy === 'Pass') results.agentic.scorePass++;
    if (agenticJudge.reasoning_quality === 'Pass') results.agentic.reasoningPass++;

    console.log(`  [Baseline] Score: ${baselineOut.score} | Judge: ${baselineJudge.score_accuracy} (Score), ${baselineJudge.reasoning_quality} (Reasoning) - ${baselineJudge.feedback}`);
    console.log(`  [Agentic]  Score: ${agenticOut.score} | Judge: ${agenticJudge.score_accuracy} (Score), ${agenticJudge.reasoning_quality} (Reasoning) - ${agenticJudge.feedback}\\n`);

    if (i < dataset.length - 1) {
      console.log("  [Rate Limit Buffer] Sleeping for 5 seconds before next case...");
      await sleep(5000);
    }
  }

  console.log("=========================================");
  console.log("📊 FINAL EVALUATION RESULTS");
  console.log("=========================================");
  console.log(`Total Cases: ${dataset.length}`);
  console.log(`\\nBaseline Performance:`);
  console.log(`- Score Accuracy:     ${results.baseline.scorePass} / ${dataset.length} (${(results.baseline.scorePass / dataset.length * 100).toFixed(1)}%)`);
  console.log(`- Reasoning Quality:  ${results.baseline.reasoningPass} / ${dataset.length} (${(results.baseline.reasoningPass / dataset.length * 100).toFixed(1)}%)`);
  
  console.log(`\\nAgentic Performance:`);
  console.log(`- Score Accuracy:     ${results.agentic.scorePass} / ${dataset.length} (${(results.agentic.scorePass / dataset.length * 100).toFixed(1)}%)`);
  console.log(`- Reasoning Quality:  ${results.agentic.reasoningPass} / ${dataset.length} (${(results.agentic.reasoningPass / dataset.length * 100).toFixed(1)}%)`);
  console.log("=========================================");
}

runEvaluation();
