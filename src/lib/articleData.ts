import type { Article, ArticleManifest, CategoryName } from '../types/article'

export function normalizeArticle(input: Partial<Article> & { id?: string; title?: string; category?: CategoryName }): Article {
  const category = input.category ?? 'Uncategorized'

  return {
    id: input.id ?? `${category}-${Date.now()}`,
    title: input.title ?? 'Untitled article',
    slug: input.slug ?? `${input.title ?? 'untitled'}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    category,
    tags: input.tags ?? [],
    summary: input.summary ?? '',
    references: input.references ?? [],
    createdAt: input.createdAt ?? new Date().toISOString(),
    updatedAt: input.updatedAt ?? new Date().toISOString(),
    contentBlocks: input.contentBlocks ?? [],
  }
}

export function getDefaultManifest(): ArticleManifest {
  return { categories: [] }
}
