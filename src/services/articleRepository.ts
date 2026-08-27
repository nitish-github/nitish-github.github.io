import type { Article, ArticleManifest, CategoryId, DataSourceMode } from '../types/article'
import { readCache, writeCache } from '../lib/idb'
import { deleteArticleFromFirebase, fetchArticlesFromFirebase, saveArticleToFirebase } from './firebaseRepository'

const manifestUrl = '/data/articles.json'
const sqliteApiBase = 'http://localhost:3001'

function readDataSource(): DataSourceMode {
  const env =
    (typeof import.meta !== 'undefined' &&
      (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env) ||
    ({} as Record<string, string | undefined>)

  const raw = env['DATA_SOURCE'] || env['VITE_DATA_SOURCE'] || 'sqlite'
  const normalized = raw.toLowerCase().replace('sqllite', 'sqlite')
  return normalized === 'firestore' ? 'firestore' : 'sqlite'
}

export function getDataSourceMode(): DataSourceMode {
  return readDataSource()
}

export async function fetchArticleManifest(): Promise<ArticleManifest> {
  const response = await fetch(manifestUrl)
  if (!response.ok) {
    throw new Error('Unable to fetch article manifest')
  }

  return response.json() as Promise<ArticleManifest>
}

export async function fetchCategories(): Promise<CategoryId[]> {
  if (readDataSource() === 'firestore') {
    const articles = await fetchArticlesFromFirebase()
    return [...new Set(articles.flatMap((article) => article.category_id))].sort()
  }

  const manifest = await fetchArticleManifest()
  return manifest.categories.map((item) => item.category_id)
}

export async function fetchCategoryArticles(category: CategoryId): Promise<Article[]> {
  if (readDataSource() === 'firestore') {
    return fetchArticlesFromFirebase(category)
  }

  const categoryKey = `${category.toLowerCase()}-articles`
  const manifest = await fetchArticleManifest()
  const entries = manifest.categories.find((item) => item.category_id === category)

  if (!entries) {
    return []
  }

  const articles = await Promise.all(
    entries.articleIds.map(async (articleId) => {
      const response = await fetch(`/data/${category}/${articleId}.json`)
      if (!response.ok) {
        throw new Error(`Unable to fetch article ${articleId}`)
      }
      return response.json() as Promise<Article>
    }),
  )

  await writeCache(categoryKey, articles)
  return articles
}

export async function getCachedCategoryArticles(category: CategoryId): Promise<Article[] | null> {
  const categoryKey = `${category.toLowerCase()}-articles`
  return readCache<Article[]>(categoryKey)
}

export async function fetchArticleBySlug(category: CategoryId, slug: string): Promise<Article | null> {
  if (readDataSource() === 'firestore') {
    const articles = await fetchArticlesFromFirebase(category)
    return articles.find((article) => article.slug === slug) ?? null
  }

  const response = await fetch(`${sqliteApiBase}/api/articles/${category}/${slug}`)
  if (!response.ok) {
    return null
  }

  return (await response.json()) as Article
}

export async function fetchArticlesFromApi(category?: CategoryId): Promise<Article[]> {
  const query = category ? `/api/articles/${category}` : '/api/articles'
  const response = await fetch(`${sqliteApiBase}${query}`)
  if (!response.ok) {
    throw new Error('Unable to fetch articles from local API')
  }

  const body = (await response.json()) as { articles: Article[] }
  return body.articles
}

export async function saveArticle(article: Article): Promise<Article> {
  if (readDataSource() === 'firestore') {
    return saveArticleToFirebase(article)
  }

  const response = await fetch(`${sqliteApiBase}/api/articles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(article),
  })

  if (!response.ok) {
    throw new Error('Unable to save article to SQLite API')
  }

  return (await response.json()) as Article
}

export async function deleteArticle(articleId: string): Promise<void> {
  if (readDataSource() === 'firestore') {
    await deleteArticleFromFirebase(articleId)
    return
  }

  const response = await fetch(`${sqliteApiBase}/api/articles/${articleId}`, { method: 'DELETE' })
  if (!response.ok) {
    throw new Error('Unable to delete article from SQLite API')
  }
}
