/**
 * whisper.js — Groq Whisper transcription service for HIRIS.
 *
 * Uses the Groq REST API with the whisper-large-v3-turbo model
 * to transcribe interview audio recordings.
 */

const fs = require('fs')
const path = require('path')


const GROQ_API_URL = 'https://api.groq.com/openai/v1/audio/transcriptions'
const WHISPER_MODEL = 'whisper-large-v3-turbo'

/**
 * Transcribe an audio file using Groq's Whisper API.
 *
 * @param {string} audioFilePath - Absolute or relative path to the audio file.
 * @returns {Promise<string>} The transcribed text.
 */
async function transcribeAudio(audioFilePath) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    console.warn('[WHISPER] GROQ_API_KEY not set — skipping transcription.')
    return null
  }

  const absPath = path.isAbsolute(audioFilePath)
    ? audioFilePath
    : path.join(__dirname, '..', audioFilePath)

  if (!fs.existsSync(absPath)) {
    console.error(`[WHISPER] Audio file not found: ${absPath}`)
    return null
  }

  const fileSize = fs.statSync(absPath).size
  console.log(`[WHISPER] Transcribing: ${absPath} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`)
  console.log(`[WHISPER] Model: ${WHISPER_MODEL}`)

  try {
    // Use native Node fetch with built-in FormData (Node 18+)
    const fileBuffer = fs.readFileSync(absPath)
    const fileBlob = new Blob([fileBuffer], { type: 'audio/webm' })
    
    const formData = new FormData()
    formData.append('file', fileBlob, path.basename(absPath))
    formData.append('model', WHISPER_MODEL)
    formData.append('response_format', 'verbose_json')
    formData.append('language', 'en')
    
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error(`[WHISPER] API error ${response.status}: ${errText}`)
      return null
    }

    const result = await response.json()
    const transcript = result.text || ''

    console.log(`[WHISPER] Transcription successful. Length: ${transcript.length} chars`)
    console.log(`[WHISPER] Duration: ${result.duration || 'N/A'}s`)

    return transcript
  } catch (err) {
    console.error(`[WHISPER] Transcription failed: ${err.message}`)
    return null
  }
}

module.exports = { transcribeAudio }
