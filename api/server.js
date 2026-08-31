import express from 'express'
import cors from 'cors'
import Database from 'better-sqlite3'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const dataDir = path.join(__dirname, 'data')
fs.mkdirSync(dataDir, { recursive: true })

const app = express()
const port = Number(process.env.PORT || 3001)

const db = new Database(path.join(dataDir, 'articles.db'))
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    createdAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expiresAt TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS user_preferences (
    user_id TEXT PRIMARY KEY,
    theme TEXT NOT NULL DEFAULT 'light',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY,
    owner_id TEXT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    category_id TEXT NOT NULL,
    tags TEXT NOT NULL,
    summary TEXT NOT NULL,
    \`references\` TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    contentBlocks TEXT NOT NULL
  )
`)

const articleColumns = db.prepare('PRAGMA table_info(articles)').all()
if (!articleColumns.some((column) => column.name === 'owner_id')) {
  db.exec('ALTER TABLE articles ADD COLUMN owner_id TEXT')
}

const hashPassword = (password) => crypto.scryptSync(password, 'article-app-password-salt', 64).toString('hex')
const demoUser = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@example.com')
if (!demoUser) {
  db.prepare('INSERT INTO users (id, email, password_hash, createdAt) VALUES (?, ?, ?, ?)').run(
    'user-demo',
    'demo@example.com',
    hashPassword('password123'),
    new Date().toISOString(),
  )
}

const columns = db.prepare('PRAGMA table_info(articles)').all()
if (columns.some((column) => column.name === 'category') && !columns.some((column) => column.name === 'category_id')) {
  db.exec('ALTER TABLE articles ADD COLUMN category_id TEXT NOT NULL DEFAULT "[]"')
  db.prepare('UPDATE articles SET category_id = json_array(category)').run()
}

app.use(cors())
app.use(express.json())

const getAuthenticatedUser = (req) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!token) return null

  const session = db.prepare(
    'SELECT users.id, users.email, sessions.token, sessions.expiresAt FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token = ?',
  ).get(token)
  if (!session || new Date(session.expiresAt) <= new Date()) {
    if (session) db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
    return null
  }

  return { id: session.id, email: session.email, token: session.token }
}

const requireUser = (req, res, next) => {
  const user = getAuthenticatedUser(req)
  if (!user) {
    res.status(401).json({ error: 'Login required' })
    return
  }
  req.user = user
  next()
}

const buildSlugFromTitleAndId = (title, id) => {
  const normalizedTitle = (title || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const normalizedId = String(id || Date.now())
  return `${normalizedTitle}-${normalizedId}`.replace(/^-+|-+$/g, '')
}

const normalizeArticle = (row) => ({
  id: row.id,
  title: row.title,
  slug: row.slug,
  category_id: JSON.parse(row.category_id),
  tags: JSON.parse(row.tags),
  summary: row.summary,
  references: JSON.parse(row.references),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  contentBlocks: JSON.parse(row.contentBlocks),
})

app.get('/health', (_, res) => {
  res.json({ status: 'ok' })
})

app.post('/api/auth/login', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase()
  const password = String(req.body.password || '')
  const user = db.prepare('SELECT id, email, password_hash FROM users WHERE email = ?').get(email)

  if (!user || !crypto.timingSafeEqual(Buffer.from(user.password_hash, 'hex'), Buffer.from(hashPassword(password), 'hex'))) {
    res.status(401).json({ error: 'Invalid email or password' })
    return
  }

  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()
  db.prepare('INSERT INTO sessions (token, user_id, expiresAt) VALUES (?, ?, ?)').run(token, user.id, expiresAt)
  const preference = db.prepare('SELECT theme FROM user_preferences WHERE user_id = ?').get(user.id)
  res.json({ user: { id: user.id, email: user.email }, token, preferences: { theme: preference?.theme || 'light' } })
})

app.get('/api/auth/me', requireUser, (req, res) => {
  const preference = db.prepare('SELECT theme FROM user_preferences WHERE user_id = ?').get(req.user.id)
  res.json({ user: { id: req.user.id, email: req.user.email }, preferences: { theme: preference?.theme || 'light' } })
})

app.post('/api/auth/logout', requireUser, (req, res) => {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(req.user.token)
  res.json({ success: true })
})

app.put('/api/auth/preferences', requireUser, (req, res) => {
  const theme = req.body.theme === 'dark' ? 'dark' : 'light'
  db.prepare(
    'INSERT INTO user_preferences (user_id, theme) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET theme = excluded.theme',
  ).run(req.user.id, theme)
  res.json({ theme })
})

app.get('/api/categories', (_, res) => {
  const rows = db.prepare('SELECT category_id FROM articles').all()
  const categories = [...new Set(rows.flatMap((row) => JSON.parse(row.category_id)))].sort()
  res.json({ categories })
})

app.get('/api/articles', (_, res) => {
  const rows = db.prepare('SELECT * FROM articles ORDER BY updatedAt DESC').all()
  res.json({ articles: rows.map(normalizeArticle) })
})

app.get('/api/my/articles', requireUser, (req, res) => {
  const rows = db.prepare('SELECT * FROM articles WHERE owner_id = ? ORDER BY updatedAt DESC').all(req.user.id)
  res.json({ articles: rows.map(normalizeArticle) })
})

app.get('/api/articles/:category', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM articles WHERE EXISTS (SELECT 1 FROM json_each(category_id) WHERE value = ?) ORDER BY updatedAt DESC')
    .all(req.params.category)
  res.json({ articles: rows.map(normalizeArticle) })
})

app.get('/api/articles/:category/:slug', (req, res) => {
  const row = db
    .prepare('SELECT * FROM articles WHERE EXISTS (SELECT 1 FROM json_each(category_id) WHERE value = ?) AND slug = ?')
    .get(req.params.category, req.params.slug)

  if (!row) {
    res.status(404).json({ error: 'Article not found' })
    return
  }

  res.json(normalizeArticle(row))
})

app.post('/api/articles', requireUser, (req, res) => {
  const payload = req.body
  const articleId = payload.id || `${Date.now()}`
  const article = {
    id: articleId,
    owner_id: req.user.id,
    title: payload.title || 'Untitled article',
    slug: buildSlugFromTitleAndId(payload.title || 'Untitled article', articleId),
    category_id: JSON.stringify(payload.category_id || []),
    tags: JSON.stringify(payload.tags || []),
    summary: payload.summary || '',
    references: JSON.stringify(payload.references || []),
    createdAt: payload.createdAt || new Date().toISOString(),
    updatedAt: payload.updatedAt || new Date().toISOString(),
    contentBlocks: JSON.stringify(payload.contentBlocks || []),
  }

  const existing = db.prepare('SELECT id, owner_id FROM articles WHERE id = ?').get(article.id)

  if (existing && existing.owner_id !== req.user.id) {
    res.status(403).json({ error: 'Article belongs to another user' })
    return
  }

  if (existing) {
    db.prepare(
      `UPDATE articles SET title = ?, slug = ?, category_id = ?, tags = ?, summary = ?, \`references\` = ?, updatedAt = ?, contentBlocks = ?, owner_id = ? WHERE id = ? AND owner_id = ?`,
    ).run(
      article.title,
      article.slug,
      article.category_id,
      article.tags,
      article.summary,
      article.references,
      article.updatedAt,
      article.contentBlocks,
      req.user.id,
      article.id,
      req.user.id,
    )
  } else {
    db.prepare(
      `INSERT INTO articles (id, owner_id, title, slug, category_id, tags, summary, \`references\`, createdAt, updatedAt, contentBlocks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      article.id,
      req.user.id,
      article.title,
      article.slug,
      article.category_id,
      article.tags,
      article.summary,
      article.references,
      article.createdAt,
      article.updatedAt,
      article.contentBlocks,
    )
  }

  res.status(201).json(normalizeArticle(article))
})

app.put('/api/articles/:id', requireUser, (req, res) => {
  const articleId = req.params.id
  const payload = req.body
  const article = {
    id: articleId,
    owner_id: req.user.id,
    title: payload.title || 'Untitled article',
    slug: buildSlugFromTitleAndId(payload.title || 'Untitled article', articleId),
    category_id: JSON.stringify(payload.category_id || []),
    tags: JSON.stringify(payload.tags || []),
    summary: payload.summary || '',
    references: JSON.stringify(payload.references || []),
    createdAt: payload.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    contentBlocks: JSON.stringify(payload.contentBlocks || []),
  }

  const existing = db.prepare('SELECT id FROM articles WHERE id = ? AND owner_id = ?').get(article.id, req.user.id)

  if (!existing) {
    res.status(404).json({ error: 'Article not found' })
    return
  }

  db.prepare(
    `UPDATE articles SET title = ?, slug = ?, category_id = ?, tags = ?, summary = ?, \`references\` = ?, updatedAt = ?, contentBlocks = ? WHERE id = ? AND owner_id = ?`,
  ).run(
    article.title,
    article.slug,
    article.category_id,
    article.tags,
    article.summary,
    article.references,
    article.updatedAt,
    article.contentBlocks,
    article.id,
    req.user.id,
  )

  res.json(normalizeArticle(article))
})

app.delete('/api/articles/:id', requireUser, (req, res) => {
  const articleId = req.params.id
  const existing = db.prepare('SELECT id FROM articles WHERE id = ? AND owner_id = ?').get(articleId, req.user.id)

  if (!existing) {
    res.status(404).json({ error: 'Article not found' })
    return
  }

  db.prepare('DELETE FROM articles WHERE id = ? AND owner_id = ?').run(articleId, req.user.id)
  res.json({ success: true, id: articleId })
})

app.listen(port, () => {
  console.log(`Article API listening on http://localhost:${port}`)
})
