/**
 * server.js — HIRIS API entry point
 *
 * Phase 4 changes:
 *   1. Sentry initialised at the top (must be first require)
 *   2. Sentry request handler registered before routes
 *   3. Sentry error handler registered before our global error handler
 *   4. Global error handler now calls Sentry.captureException
 */

// ── MUST be the very first require ───────────────────────────────────────────
const { Sentry, sentryErrorHandler } = require('./config/sentry')
const path = require('path')
const fs = require('fs')
const { config: loadEnv } = require('dotenv')

const envCandidates = [
  path.join(__dirname, '.env'),
  path.join(__dirname, '..', '..', 'backend', '.env'),
  path.join(process.cwd(), '.env'),
]
const envPath = envCandidates.find(p => fs.existsSync(p))
if (envPath) {
  loadEnv({ path: envPath })
  console.log(`[env] Loaded environment from ${envPath}`)
} else {
  loadEnv()
}

require('express-async-errors')

;(function validateEnv() {
  const WEAK_SECRETS = ['super-secret-key-123', 'secret', 'changeme', 'jwt_secret']
  const secret = process.env.JWT_SECRET
  if (!secret || secret.trim() === '') { console.error('\n[FATAL] JWT_SECRET is not set.\n'); process.exit(1) }
  if (WEAK_SECRETS.includes(secret.toLowerCase())) { console.error(`\n[FATAL] JWT_SECRET is weak: "${secret}"\n`); process.exit(1) }
})()

const express      = require('express')
const cors         = require('cors')
const cookieParser = require('cookie-parser')
const helmet       = require('helmet')
const morgan       = require('morgan')
const rateLimit    = require('express-rate-limit')
const winston      = require('winston')
const swaggerJsdoc = require('swagger-jsdoc')
const swaggerUi    = require('swagger-ui-express')

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  defaultMeta: { service: 'hiris-backend' },
  transports: [new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? winston.format.json() : winston.format.simple()
  })],
})

const app = express()

// Sentry request handler must be FIRST
app.use(Sentry.Handlers.requestHandler())

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }))
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

function isAllowedCorsOrigin(origin) {
  if (!origin) return true

  const configuredOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)

  if (configuredOrigins.includes(origin)) return true

  if (process.env.NODE_ENV !== 'production') {
    return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
  }

  return false
}

app.use(cors({
  origin: (origin, cb) => {
    if (isAllowedCorsOrigin(origin)) return cb(null, true)
    const error = new Error('Not allowed by CORS'); error.status = 403; cb(error)
  },
  credentials: true,
}))

app.use('/api', rateLimit({ windowMs: 15*60*1000, max: 1000, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' } }))

app.use('/api/auth/login', rateLimit({ windowMs: 15*60*1000, max: 10, standardHeaders: true, legacyHeaders: false,
  skipSuccessfulRequests: true, message: { error: 'Too many login attempts. Please wait 15 minutes.' } }))

app.use(express.json())
app.use(cookieParser())
app.use('/uploads', express.static('uploads'))

const PORT = process.env.PORT || 3001
app.get('/', (_, res) => res.send(`<html><body style="font-family:sans-serif;background:#0F172A;color:white;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center"><h1>HIRIS API</h1><p>Running on port ${PORT}</p><a href="/api-docs" style="color:#10B981">API Docs</a></div></body></html>`))

const swaggerSpec = swaggerJsdoc({
  swaggerDefinition: {
    openapi: '3.0.0',
    info: { title: 'HIRIS API', version: '1.0.0' },
    servers: [{ url: process.env.PUBLIC_API_URL || `http://localhost:${PORT}` }],
  },
  apis: ['./routes/*.js'],
})
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

app.use('/api/auth',  require('./routes/auth'))
app.use('/api/roles', require('./routes/roles'))
app.use('/api',       require('./routes/core'))
app.use('/api',       require('./routes/assistant'))
app.use('/api',       require('./routes/chro'))
app.use('/api',       require('./routes/pipeline'))
app.use('/api',       require('./routes/candidates'))
app.use('/api',       require('./routes/interviews'))
app.use('/api',       require('./routes/job_portal'))
app.use('/api',       require('./routes/archive'))
app.use('/api/ai',    require('./routes/ai'))

// 404 for missing /api routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` })
})

/** @swagger
 * /api/health:
 *   get:
 *     summary: Health check
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Healthy
 */
app.get('/api/health', (_, res) => res.json({ ok: true }))

// Sentry error handler BEFORE our own
app.use(sentryErrorHandler)

// Global error handler
app.use((err, req, res, _next) => {
  const isDev = process.env.NODE_ENV !== 'production'
  logger.error(err.message, { stack: err.stack, path: req.path, method: req.method })
  Sentry.captureException(err, { tags: { path: req.path, method: req.method } })
  res.status(err.status || 500).json({ error: isDev ? err.message : 'An unexpected error occurred.' })
})

app.listen(PORT, () => console.log(`HIRIS API → http://localhost:${PORT}`))
