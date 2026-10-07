import type { Article, ArticleManifest, CategoryId, CategoryManifestItem, DataSourceMode } from '../types/article'
import { readCache, writeCache } from './idb'
import { deleteArticleFromFirebase, fetchArticlesFromFirebase, saveArticleToFirebase } from './firebaseRepository'
import { getAuthToken } from '../auth/localAuth'

const manifestUrl = '/data/articles.json'
const sqliteApiBase = 'http://localhost:3001'

function authHeaders(): HeadersInit {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

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
  const manifest = await fetchArticleManifest()
  const getLeafCategories = (categories: ArticleManifest['categories']): CategoryId[] =>
    categories.flatMap((item) => (
      item.categories?.length
        ? getLeafCategories(item.categories)
        : [item.category_id]
    ))

  return getLeafCategories(manifest.categories)
}

export async function fetchCategoryTree(): Promise<ArticleManifest['categories']> {
  const manifest = await fetchArticleManifest()
  return manifest.categories
}

export async function fetchCategoryArticles(category: CategoryId): Promise<Article[]> {
  const categoryKey = `${category.toLowerCase()}-articles`
  const manifest = await fetchArticleManifest()
  const findCategory = (categories: ArticleManifest['categories']): CategoryManifestItem | undefined => {
    for (const item of categories) {
      if (item.category_id === category) return item
      const nested: CategoryManifestItem | undefined = item.categories && findCategory(item.categories)
      if (nested) return nested
    }

    return undefined
  }
  const entries = findCategory(manifest.categories)

  if (!entries || !entries.articleIds?.length) {
    return []
  }

  const articles = await Promise.all(
    entries.articleIds.map(async (articleId) => {
      const response = await fetch(`/data/${entries.path ?? category}/${articleId}.json`)
      if (!response.ok) {
        throw new Error(`Unable to fetch article ${articleId}`)
      }
      return response.json() as Promise<Article>
    }),
  )

  await writeCache(categoryKey, articles)
  return articles
}

export async function fetchMyArticles(category?: CategoryId): Promise<Article[]> {
  if (readDataSource() === 'firestore') {
    return fetchArticlesFromFirebase(category)
  }

  return fetchArticlesFromApi(category, true)
}

export async function fetchMyCategories(): Promise<CategoryId[]> {
  const articles = await fetchMyArticles()
  return [...new Set(articles.flatMap((article) => article.category_id))].sort()
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

export async function fetchArticlesFromApi(category?: CategoryId, mine = false): Promise<Article[]> {
  const query = mine ? '/api/my/articles' : category ? `/api/articles/${category}` : '/api/articles'
  const response = await fetch(`${sqliteApiBase}${query}`, { headers: authHeaders() })
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
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
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

  const response = await fetch(`${sqliteApiBase}/api/articles/${articleId}`, { method: 'DELETE', headers: authHeaders() })
  if (!response.ok) {
    throw new Error('Unable to delete article from SQLite API')
  }
}
