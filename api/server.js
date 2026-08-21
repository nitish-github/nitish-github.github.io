import express from 'express'
import cors from 'cors'
import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const dataDir = path.join(__dirname, 'data')
fs.mkdirSync(dataDir, { recursive: true })

const app = express()
const port = 3001

const db = new Database(path.join(dataDir, 'articles.db'))
db.exec(`
  CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    category TEXT NOT NULL,
    tags TEXT NOT NULL,
    summary TEXT NOT NULL,
    \`references\` TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    contentBlocks TEXT NOT NULL
  )
`)

app.use(cors())
app.use(express.json())

const normalizeArticle = (row) => ({
  id: row.id,
  title: row.title,
  slug: row.slug,
  category: row.category,
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

app.get('/api/categories', (_, res) => {
  const rows = db.prepare('SELECT DISTINCT category FROM articles ORDER BY category ASC').all()
  res.json({ categories: rows.map((row) => row.category) })
})

app.get('/api/articles', (_, res) => {
  const rows = db.prepare('SELECT * FROM articles ORDER BY updatedAt DESC').all()
  res.json({ articles: rows.map(normalizeArticle) })
})

app.get('/api/articles/:category', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM articles WHERE category = ? ORDER BY updatedAt DESC')
    .all(req.params.category)
  res.json({ articles: rows.map(normalizeArticle) })
})

app.get('/api/articles/:category/:slug', (req, res) => {
  const row = db
    .prepare('SELECT * FROM articles WHERE category = ? AND slug = ?')
    .get(req.params.category, req.params.slug)

  if (!row) {
    res.status(404).json({ error: 'Article not found' })
    return
  }

  res.json(normalizeArticle(row))
})

app.post('/api/articles', (req, res) => {
  const payload = req.body
  const article = {
    id: payload.id || `${Date.now()}`,
    title: payload.title || 'Untitled article',
    slug: payload.slug || payload.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `article-${Date.now()}`,
    category: payload.category || 'Uncategorized',
    tags: JSON.stringify(payload.tags || []),
    summary: payload.summary || '',
    references: JSON.stringify(payload.references || []),
    createdAt: payload.createdAt || new Date().toISOString(),
    updatedAt: payload.updatedAt || new Date().toISOString(),
    contentBlocks: JSON.stringify(payload.contentBlocks || []),
  }

  const existing = db.prepare('SELECT id FROM articles WHERE id = ?').get(article.id)

  if (existing) {
    db.prepare(
      `UPDATE articles SET title = ?, slug = ?, category = ?, tags = ?, summary = ?, \`references\` = ?, updatedAt = ?, contentBlocks = ? WHERE id = ?`,
    ).run(
      article.title,
      article.slug,
      article.category,
      article.tags,
      article.summary,
      article.references,
      article.updatedAt,
      article.contentBlocks,
      article.id,
    )
  } else {
    db.prepare(
      `INSERT INTO articles (id, title, slug, category, tags, summary, \`references\`, createdAt, updatedAt, contentBlocks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      article.id,
      article.title,
      article.slug,
      article.category,
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

app.put('/api/articles/:id', (req, res) => {
  const articleId = req.params.id
  const payload = req.body
  const article = {
    id: articleId,
    title: payload.title || 'Untitled article',
    slug: payload.slug || payload.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `article-${Date.now()}`,
    category: payload.category || 'Uncategorized',
    tags: JSON.stringify(payload.tags || []),
    summary: payload.summary || '',
    references: JSON.stringify(payload.references || []),
    createdAt: payload.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    contentBlocks: JSON.stringify(payload.contentBlocks || []),
  }

  const existing = db.prepare('SELECT id FROM articles WHERE id = ?').get(article.id)

  if (!existing) {
    res.status(404).json({ error: 'Article not found' })
    return
  }

  db.prepare(
    `UPDATE articles SET title = ?, slug = ?, category = ?, tags = ?, summary = ?, \`references\` = ?, updatedAt = ?, contentBlocks = ? WHERE id = ?`,
  ).run(
    article.title,
    article.slug,
    article.category,
    article.tags,
    article.summary,
    article.references,
    article.updatedAt,
    article.contentBlocks,
    article.id,
  )

  res.json(normalizeArticle(article))
})

app.delete('/api/articles/:id', (req, res) => {
  const articleId = req.params.id
  const existing = db.prepare('SELECT id FROM articles WHERE id = ?').get(articleId)

  if (!existing) {
    res.status(404).json({ error: 'Article not found' })
    return
  }

  db.prepare('DELETE FROM articles WHERE id = ?').run(articleId)
  res.json({ success: true, id: articleId })
})

app.listen(port, () => {
  console.log(`Article API listening on http://localhost:${port}`)
})
