export type CategoryName = string

export type DataSourceMode = 'sqlite' | 'firestore'

export type EditorType = 'custom' | 'tiptap' | 'lexical'

export type ContentSourceKey = 'custom' | 'tiptap' | 'lexical'

export type ArticleContentBlock = {
  id: string
  type: 'paragraph' | 'heading' | 'quote' | 'list' | 'code'
  order: number
  rawJson: Record<string, unknown> & {
    editor?: EditorType | string
    contentType?: ContentSourceKey | string
  }
}

export type ArticleReference = {
  label: string
  url: string
}

export type Article = {
  id: string
  title: string
  slug: string
  category: CategoryName
  tags: string[]
  summary: string
  references: ArticleReference[]
  createdAt: string
  updatedAt: string
  contentBlocks: ArticleContentBlock[]
}

export type CategoryManifestItem = {
  name: CategoryName
  description: string
  articleIds: string[]
}

export type ArticleManifest = {
  categories: CategoryManifestItem[]
}
