require('dotenv').config()
const fs = require('fs')
const path = require('path')
const {
  scoreResumeJobMatchSingleLLM,
  scoreResumeJobMatchAgentic,
} = require('./implementations')
const { generateContentWithRetry, parseJsonObject, sleep } = require('./utils')

async function judgeOutput(modelOutput, groundTruth) {
  const scoreDeviation = Math.abs(Number(modelOutput.suitability_score) - Number(groundTruth.suitability_score))

  const prompt = `
You are an LLM-as-a-Judge for a Resume-to-Job Matching AI endpoint.

Ground Truth from human HR expert:
Suitability Score: ${groundTruth.suitability_score}/10
Rationale: ${groundTruth.rationale}

AI Output:
Suitability Score: ${modelOutput.suitability_score}/10
Rationale: ${modelOutput.rationale}

Known numeric score deviation: ${scoreDeviation.toFixed(2)}

Judge the AI output on:
1. rationale_accuracy: Does the AI rationale capture the same key strengths and gaps as the HR expert?
2. score_alignment: Is the score close enough to the human score? Penalize deviations above 2 points.
3. hallucination_risk: Does the AI invent unsupported details?

Return only JSON:
{
  "rationale_accuracy": number from 0 to 1,
  "score_alignment": number from 0 to 1,
  "hallucination_risk": number from 0 to 1,
  "feedback": "one concise sentence",
  "alignment_metric": number from 0 to 1
}

alignment_metric should weight rationale_accuracy 50%, score_alignment 35%, and low hallucination risk 15%.
`

  const response = await generateContentWithRetry({
    contents: prompt,
    config: { responseMimeType: 'application/json' },
  })
  const judged = parseJsonObject(response.text)

  const fallbackScoreAlignment = Math.max(0, 1 - scoreDeviation / 4)
  const rationaleAccuracy = Number(judged.rationale_accuracy)
  const scoreAlignment = Number(judged.score_alignment)
  const hallucinationRisk = Number(judged.hallucination_risk)

  const normalized = {
    rationale_accuracy: Number.isFinite(rationaleAccuracy) ? rationaleAccuracy : 0,
    score_alignment: Number.isFinite(scoreAlignment) ? scoreAlignment : fallbackScoreAlignment,
    hallucination_risk: Number.isFinite(hallucinationRisk) ? hallucinationRisk : 0.5,
    feedback: String(judged.feedback || 'Judge returned incomplete feedback.'),
  }

  const metric = Number(judged.alignment_metric)
  normalized.alignment_metric = Number.isFinite(metric)
    ? metric
    : (
        normalized.rationale_accuracy * 0.5 +
        normalized.score_alignment * 0.35 +
        (1 - normalized.hallucination_risk) * 0.15
      )

  return normalized
}

async function evaluateImplementation(name, implementation, dataset) {
  const caseResults = []

  for (const item of dataset) {
    const output = await implementation(item.input.resume_text, item.input.job_description)
    const judge = await judgeOutput(output, item.ground_truth)

    caseResults.push({
      id: item.id,
      output,
      judge,
    })

    console.log(
      `${name} | ${item.id} | score=${output.suitability_score}/10 | alignment=${judge.alignment_metric.toFixed(2)} | ${judge.feedback}`
    )
    await sleep(1500)
  }

  const alignmentMetric =
    caseResults.reduce((sum, result) => sum + result.judge.alignment_metric, 0) / caseResults.length

  return {
    name,
    alignment_metric: Number(alignmentMetric.toFixed(3)),
    cases: caseResults,
  }
}

async function runEvaluation() {
  if (!process.env.GEMINI_API_KEY) {
    console.error('ERROR: GEMINI_API_KEY is not set. Add it to packages/evaluation/.env or your shell environment.')
    process.exit(1)
  }

  const datasetPath = path.join(__dirname, 'dataset.json')
  const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'))

  console.log(`Evaluating Resume-to-Job Matching on ${dataset.length} gold cases.\n`)

  const single = await evaluateImplementation(
    'single_llm_baseline',
    scoreResumeJobMatchSingleLLM,
    dataset
  )

  const agentic = await evaluateImplementation(
    'agentic_baseline',
    scoreResumeJobMatchAgentic,
    dataset
  )

  const report = {
    endpoint: 'resume_to_job_matching',
    evaluated_at: new Date().toISOString(),
    dataset_size: dataset.length,
    results: [single, agentic],
  }

  const reportPath = path.join(__dirname, 'latest-results.json')
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`)

  console.log('\nFinal Alignment Metrics')
  console.log(`Single LLM Baseline: ${single.alignment_metric}`)
  console.log(`Agentic Baseline:    ${agentic.alignment_metric}`)
  console.log(`Saved report: ${reportPath}`)
}

runEvaluation().catch(error => {
  console.error('Evaluation failed:', error)
  process.exit(1)
})
