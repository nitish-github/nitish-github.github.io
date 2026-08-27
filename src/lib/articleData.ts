import type { Article, ArticleManifest, CategoryId } from '../types/article'

export function normalizeArticle(input: Partial<Article> & { id?: string; title?: string; category_id?: CategoryId[] }): Article {
  const categoryIds = input.category_id ?? []
  const now = new Date().toISOString()

  return {
    id: input.id ?? `${categoryIds[0] ?? 'uncategorized'}-${Date.now()}`,
    title: input.title ?? 'Untitled article',
    slug: input.slug ?? `${input.title ?? 'untitled'}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    category_id: categoryIds,
    tags: input.tags ?? [],
    summary: input.summary ?? '',
    references: input.references ?? [],
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
    contentBlocks: input.contentBlocks ?? {},
  }
}

export function getDefaultManifest(): ArticleManifest {
  return { categories: [] }
}
