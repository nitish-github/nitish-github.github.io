import { Alert, Autocomplete, Box, Button, Chip, FormControl, InputLabel, MenuItem, Select, Stack, TextField, Typography } from '@mui/material'
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { deleteArticle, fetchCategories, getDataSourceMode, saveArticle } from './database/articleRepository'
import { firebaseAuth } from './database/firebase'
import type { Article, ArticleBlock, CategoryId, EditorType } from './types/article'

const CustomEditor = lazy(async () => {
  const module = await import('./editor/custom/CustomEditor')
  return { default: module.CustomEditor }
})

const TiptapEditor = lazy(async () => {
  const module = await import('./editor/tiptap/TiptapEditor')
  return { default: module.TiptapEditor }
})

const LexicalEditor = lazy(async () => {
  const module = await import('./editor/lexical/LexicalEditor')
  return { default: module.LexicalEditor }
})

type EditorMode = 'create' | 'edit'

type Props = {
  mode?: EditorMode
  article?: Article | null
  onSaved?: (article: Article) => void
  onCancel?: () => void
  onDeleted?: (articleId: string) => void
}

type ContentBlockDraft = ArticleBlock

function buildGeneratedSlug(title: string, id: string): string {
  const normalizedTitle = title.trim() || 'untitled'
  return `${normalizedTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${id}`.replace(/^-+|-+$/g, '')
}

function createDefaultContent(editorType: EditorType): Record<string, unknown> | string {
  if (editorType === 'custom') return ''

  if (editorType === 'lexical') {
    return {
      root: {
        children: [],
        direction: null,
        format: '',
        indent: 0,
        type: 'root',
        version: 1,
      },
    }
  }

  return {
    type: 'doc',
    content: [{ type: 'paragraph' }],
  }
}

function createDefaultBlock(editorType: EditorType, id = `block-${Date.now()}`): ContentBlockDraft {
  const content = createDefaultContent(editorType)
  return {
    id,
    type: 'Doc',
    order: 0,
    contents: [{
      id: `${id}-content`,
      editorType,
      contents: typeof content === 'string' ? { text: content } : content,
    }],
  }
}

const emptyDraft = {
  categoryId: '',
  title: '',
  slug: '',
  tags: 'ai, workflow',
  summary: '',
  references: 'https://example.com',
  contentBlocks: [createDefaultBlock('tiptap', 'block-initial')],
}

function toArticleDraft(article: Partial<Article> | null | undefined) {
  if (!article) return emptyDraft

  const contentBlocks = Object.values(article.contentBlocks ?? {})
    .sort((left, right) => left.order - right.order)
  const normalizedBlocks = contentBlocks.length > 0
    ? contentBlocks
    : [createDefaultBlock('tiptap')]

  return {
    categoryId: article.category_id?.[0] ?? '',
    title: article.title ?? '',
    slug: article.slug ?? '',
    tags: (article.tags ?? []).join(', '),
    summary: article.summary ?? '',
    references: (article.references ?? []).map((reference) => reference.url).join('\n'),
    contentBlocks: normalizedBlocks,
  }
}

function getBlockEditorContent(block: ContentBlockDraft): Record<string, unknown> | string {
  const content = block.contents[0]
  if (content?.editorType === 'custom' && typeof content.contents.text === 'string') return content.contents.text
  return content?.contents ?? {}
}

function areDraftsEqual(left: ReturnType<typeof toArticleDraft>, right: ReturnType<typeof toArticleDraft>) {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function ArticleEditor({ mode = 'create', article, onSaved, onCancel, onDeleted }: Props) {
  const [categories, setCategories] = useState<CategoryId[]>([])
  const [draft, setDraft] = useState(toArticleDraft(article))
  const [contentBlocks, setContentBlocks] = useState<ContentBlockDraft[]>(draft.contentBlocks)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const newDraft = toArticleDraft(article)

    setDraft((currentDraft) => {
      if (areDraftsEqual(currentDraft, newDraft)) {
        return currentDraft
      }

      return newDraft
    })

    setContentBlocks((currentBlocks) => {
      if (JSON.stringify(currentBlocks) === JSON.stringify(newDraft.contentBlocks)) {
        return currentBlocks
      }

      return newDraft.contentBlocks
    })
  }, [article, mode])

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setCategories(await fetchCategories())
      } catch {
        setCategories([])
      }
    }

    void loadCategories()
  }, [])

  const tags = useMemo(
    () => draft.tags.split(',').map((item) => item.trim()).filter(Boolean),
    [draft.tags],
  )

  const references = useMemo(
    () =>
      draft.references
        .split(/\n|,/) 
        .map((item) => item.trim())
        .filter(Boolean)
        .map((url) => ({
          label: url.replace(/^https?:\/\//, ''),
          url,
        })),
    [draft.references],
  )

  const handleEditorChange = useCallback((blockId: string, value: Record<string, unknown>) => {
    setContentBlocks((previousBlocks) => previousBlocks.map((block) => (
      block.id === blockId && block.contents[0] && JSON.stringify(block.contents[0].contents) !== JSON.stringify(value)
        ? { ...block, contents: [{ ...block.contents[0], contents: value }] }
        : block
    )))
  }, [])

  const handleEditorTypeChange = (blockId: string, editorType: EditorType) => {
    setContentBlocks((previousBlocks) => previousBlocks.map((block) => {
      if (block.id !== blockId) return block
      const content = createDefaultContent(editorType)
      return {
        ...block,
        contents: [{
          ...(block.contents[0] ?? { id: `${block.id}-content` }),
          editorType,
          contents: typeof content === 'string' ? { text: content } : content,
        }],
      }
    }))
  }

  const addContentBlock = () => {
    setContentBlocks((previousBlocks) => [
      ...previousBlocks,
      createDefaultBlock(previousBlocks.at(-1)?.contents[0]?.editorType ?? 'tiptap'),
    ])
  }

  const removeContentBlock = (blockId: string) => {
    setContentBlocks((previousBlocks) => (
      previousBlocks.length > 1 ? previousBlocks.filter((block) => block.id !== blockId) : previousBlocks
    ))
  }

  const buildArticle = (): Article => {
    const title = draft.title.trim()
    const articleId = article?.id || `${draft.categoryId.toLowerCase()}-${Date.now()}`
    const slug = buildGeneratedSlug(title, articleId)

    return {
      owner: article?.owner || firebaseAuth.currentUser?.uid || '',
      id: articleId,
      title,
      slug,
      category_id: draft.categoryId ? [draft.categoryId] : [],
      tags,
      summary: draft.summary,
      references,
      createdAt: article?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      contentBlocks: Object.fromEntries(contentBlocks.map((block, index) => [
        index,
        { ...block, order: index },
      ])),
    }
  }

  const handleSubmit = async () => {
    setError(null)
    setStatus(null)
    setIsSubmitting(true)

    try {
      if (getDataSourceMode() === 'firestore' && !firebaseAuth.currentUser) {
        throw new Error('Sign in with Firebase before saving an article.')
      }

      const payload = buildArticle()
      const saved = await saveArticle(payload)
      const nextDraft = toArticleDraft(saved)
      setDraft(nextDraft)
      setContentBlocks(nextDraft.contentBlocks)
      setStatus(mode === 'edit' ? 'Article updated.' : 'Article created.')
      onSaved?.(saved)
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Unable to save article.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!article?.id) return

    setError(null)
    setStatus(null)

    try {
      await deleteArticle(article.id)
      setStatus('Article deleted.')
      onDeleted?.(article.id)
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Unable to delete article.'
      setError(message)
    }
  }

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        {mode === 'edit' ? 'Edit article' : 'Create article'}
      </Typography>

      <Stack spacing={2}>
        <Autocomplete
          freeSolo
          options={categories}
          value={draft.categoryId}
          onChange={(_, value) => setDraft((prev) => ({ ...prev, categoryId: value ?? '' }))}
          onInputChange={(_, value) => setDraft((prev) => ({ ...prev, categoryId: value }))}
          renderInput={(params) => <TextField {...params} label="Category ID" />}
        />

        <TextField
          label="Title"
          value={draft.title}
          onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
        />

        {(mode === 'edit' || draft.slug) && (
          <TextField
            label="Slug"
            value={draft.slug}
            slotProps={{ htmlInput: { readOnly: true } }}
            helperText={mode === 'create' ? 'Generated automatically on save.' : 'Auto-generated from title and id.'}
          />
        )}

        <TextField
          label="Tags"
          value={draft.tags}
          onChange={(event) => setDraft((prev) => ({ ...prev, tags: event.target.value }))}
        />

        <TextField
          label="Summary"
          multiline
          minRows={3}
          value={draft.summary}
          onChange={(event) => setDraft((prev) => ({ ...prev, summary: event.target.value }))}
        />

        <TextField
          label="References (one URL per line or comma separated)"
          multiline
          minRows={3}
          value={draft.references}
          onChange={(event) => setDraft((prev) => ({ ...prev, references: event.target.value }))}
        />

        <Box>
          <Stack direction="row" sx={{ mb: 1 }}>
            <Typography variant="subtitle1">
              Content
            </Typography>
            <Button variant="outlined" size="small" onClick={addContentBlock}>
              Add content block
            </Button>
          </Stack>
          <Stack spacing={2}>
            {contentBlocks.map((block, index) => (
              <Box key={block.id} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
                <Stack direction="row" spacing={1} sx={{ mb: 1, justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">Block {index + 1}</Typography>
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel id={`editor-type-label-${block.id}`}>Editor</InputLabel>
                    <Select
                      labelId={`editor-type-label-${block.id}`}
                      value={block.contents[0]?.editorType ?? 'tiptap'}
                      label="Editor"
                      onChange={(event) => handleEditorTypeChange(block.id, event.target.value as EditorType)}
                    >
                      <MenuItem value="custom">Custom</MenuItem>
                      <MenuItem value="tiptap">Tiptap</MenuItem>
                      <MenuItem value="lexical">Lexical</MenuItem>
                    </Select>
                  </FormControl>
                  <Button
                    color="error"
                    size="small"
                    onClick={() => removeContentBlock(block.id)}
                    disabled={contentBlocks.length === 1}
                  >
                    Remove
                  </Button>
                </Stack>
                {(block.contents[0]?.editorType ?? 'tiptap') === 'custom' && (
                  <Suspense fallback={<Box sx={{ p: 2 }}>Loading editor...</Box>}>
                    <CustomEditor
                      content={getBlockEditorContent(block)}
                      onChange={(value) => handleEditorChange(block.id, value)}
                      editable={true}
                    />
                  </Suspense>
                )}
                {(block.contents[0]?.editorType ?? 'tiptap') === 'tiptap' && (
                  <Suspense fallback={<Box sx={{ p: 2 }}>Loading editor...</Box>}>
                    <TiptapEditor
                      content={getBlockEditorContent(block)}
                      onChange={(value) => handleEditorChange(block.id, value)}
                      editable={true}
                    />
                  </Suspense>
                )}
                {(block.contents[0]?.editorType ?? 'tiptap') === 'lexical' && (
                  <Suspense fallback={<Box sx={{ p: 2 }}>Loading editor...</Box>}>
                    <LexicalEditor
                      content={getBlockEditorContent(block)}
                      onChange={(value) => handleEditorChange(block.id, value)}
                      editable={true}
                    />
                  </Suspense>
                )}
              </Box>
            ))}
          </Stack>
        </Box>

        {tags.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            {tags.map((tag) => (
              <Chip key={tag} label={tag} variant="outlined" />
            ))}
          </Stack>
        )}

        {status && <Alert severity="success">{status}</Alert>}
        {error && <Alert severity="error">{error}</Alert>}

        <Stack direction="row" spacing={2}>
          <Button variant="contained" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : mode === 'edit' ? 'Update article' : 'Create article'}
          </Button>

          {mode === 'edit' && article?.id && (
            <Button variant="outlined" color="error" onClick={handleDelete}>
              Delete article
            </Button>
          )}

          {onCancel && (
            <Button variant="text" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </Stack>
      </Stack>
    </Box>
  )
}
