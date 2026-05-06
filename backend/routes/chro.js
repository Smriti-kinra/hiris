const express  = require('express')
const router   = express.Router()
const multer   = require('multer')
const path     = require('path')
const fs       = require('fs')
const { query }       = require('../config/db')
const { requireAuth } = require('../middleware/auth')

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads')
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')
    cb(null, `${Date.now()}_${safe}`)
  },
})
const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true)
    else cb(new Error('Only PDF files are allowed.'))
  },
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
})

// ─── GET latest institutional values PDF ─────────────────────────────────────
router.get('/chro/institutional-values', requireAuth, async (req, res) => {
  const { rows } = await query(
    `SELECT id, title, filename, filepath, uploaded_by, uploaded_at, version
     FROM policy_documents
     WHERE category = 'institutional_values'
     ORDER BY version DESC LIMIT 1`
  )
  if (!rows[0]) return res.status(404).json({ error: 'No document uploaded yet.' })
  res.json(rows[0])
})

// ─── GET all versions ─────────────────────────────────────────────────────────
router.get('/chro/institutional-values/history', requireAuth, async (req, res) => {
  const { rows } = await query(
    `SELECT id, title, filename, uploaded_at, version
     FROM policy_documents
     WHERE category = 'institutional_values'
     ORDER BY version DESC`
  )
  res.json(rows)
})

// ─── POST upload new PDF ──────────────────────────────────────────────────────
router.post('/chro/institutional-values', requireAuth, upload.single('document'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' })
  const { title } = req.body
  if (!title) return res.status(400).json({ error: 'Title is required.' })

  // Get next version
  const { rows: vRows } = await query(
    `SELECT COALESCE(MAX(version),0)+1 AS next FROM policy_documents WHERE category='institutional_values'`
  )
  const version = vRows[0].next

  const { rows } = await query(
    `INSERT INTO policy_documents (category, title, filename, filepath, uploaded_by, version)
     VALUES ('institutional_values', $1, $2, $3, $4, $5)
     RETURNING id, title, filename, uploaded_at, version`,
    [title, req.file.originalname, req.file.path, req.currentUser.userId, version]
  )
  res.status(201).json(rows[0])
})

// ─── Serve / download a specific PDF ─────────────────────────────────────────
router.get('/chro/institutional-values/:id/download', requireAuth, async (req, res) => {
  const { rows } = await query(
    `SELECT filepath, filename FROM policy_documents WHERE id=$1 AND category='institutional_values'`,
    [req.params.id]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Document not found.' })
  const { filepath, filename } = rows[0]
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'File missing from server.' })
  res.download(filepath, filename)
})

module.exports = router
