export type DataSourceMode = 'sqlite' | 'firestore'

export type CategoryId = string

export type Category = {
  id: CategoryId
  name: string
  description: string
}

export type EditorType = 'custom' | 'tiptap' | 'lexical' | 'markdown'

export type ContentType = 'Doc' | 'Questions' | 'quote' | 'list' | 'code'

export type contentBlock = {
  id: string
  editorType: EditorType
  contents: Record<string, unknown> // The raw JSON data from the editor, which can be used to reconstruct the content block in the editor.
}

export type ArticleReference = {
  label: string
  url: string
}

export type Owner = {
  owner: string
  createdAt: string
  updatedAt: string
}

export type ArticleBlock = {
  id: string
  type: ContentType
  order: number
  contents: contentBlock[]
}

export type Article = Owner & {
  id: string
  title: string
  slug: string
  category_id: CategoryId[]
  tags: string[]
  summary: string
  references: ArticleReference[]
  contentBlocks: Record<number, ArticleBlock> //number is sequence number of the content block in the article, starting from 0 
}

export type CategoryManifestItem = {
  category_id: CategoryId
  description: string
  format?: 'markdown'
  articleIds?: string[]
  path?: string
  categories?: CategoryManifestItem[]
}

export type ArticleManifest = {
  categories: CategoryManifestItem[]
}
