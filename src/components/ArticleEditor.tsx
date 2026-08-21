import { Alert, Autocomplete, Box, Button, Chip, FormControl, InputLabel, MenuItem, Select, Stack, TextField, Typography } from '@mui/material'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { deleteArticle, fetchCategories, getDataSourceMode, saveArticle } from '../services/articleRepository'
import { firebaseAuth } from '../firebase/firebase'
import type { Article, CategoryName, EditorType } from '../types/article'
import { CustomEditor } from './CustomEditor'
import { TiptapEditor } from './TiptapEditor'
import { LexicalEditor } from './LexicalEditor'

type EditorMode = 'create' | 'edit'

type Props = {
  mode?: EditorMode
  article?: Article | null
  onSaved?: (article: Article) => void
  onCancel?: () => void
  onDeleted?: (articleId: string) => void
}

const emptyDraft = {
  category: '' as CategoryName,
  title: '',
  slug: '',
  tags: 'ai, workflow',
  summary: '',
  references: 'https://example.com',
  contentBlocks: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'The article begins here.' }],
      },
    ],
  } as Record<string, unknown>,
  editorType: 'tiptap' as EditorType,
}

function toArticleDraft(article: Partial<Article> | null | undefined) {
  if (!article) return emptyDraft

  const editorType = (article.contentBlocks?.[0]?.rawJson?.editor as EditorType) ?? 'custom'
  const contentData = article.contentBlocks?.[0]?.rawJson
  const { editor: _editor, contentType: _contentType, ...editorContent } = contentData ?? {}

  return {
    category: article.category ?? '',
    title: article.title ?? '',
    slug: article.slug ?? '',
    tags: (article.tags ?? []).join(', '),
    summary: article.summary ?? '',
    references: (article.references ?? []).map((reference) => reference.url).join('\n'),
    contentBlocks: contentData
      ? editorType === 'custom' && typeof contentData.text === 'string'
        ? contentData.text
        : editorContent
      : '',
    editorType,
  }
}

export function ArticleEditor({ mode = 'create', article, onSaved, onCancel, onDeleted }: Props) {
  const [categories, setCategories] = useState<CategoryName[]>([])
  const [draft, setDraft] = useState(toArticleDraft(article))
  const [editorContent, setEditorContent] = useState<Record<string, unknown> | string>(draft.contentBlocks)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const newDraft = toArticleDraft(article)
    setDraft(newDraft)
    setEditorContent(newDraft.contentBlocks)
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

  const handleEditorChange = useCallback((value: Record<string, unknown>) => {
    setEditorContent((previousValue) => (
      JSON.stringify(previousValue) === JSON.stringify(value) ? previousValue : value
    ))
  }, [])

  const buildArticle = (): Article => {
    const title = draft.title.trim()
    const slug = (draft.slug || title).toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const articleId = article?.id || `${draft.category.toLowerCase()}-${slug}-${Date.now()}`

    // Prepare rawJson based on editor type
    let rawJson: Record<string, unknown>
    if (draft.editorType === 'custom') {
      rawJson = {
        editor: draft.editorType,
        contentType: 'custom',
        text: typeof editorContent === 'string' ? editorContent : JSON.stringify(editorContent),
      }
    } else if (typeof editorContent === 'object' && editorContent !== null) {
      rawJson = {
        editor: draft.editorType,
        contentType: draft.editorType,
        ...(editorContent as Record<string, unknown>),
      }
    } else {
      rawJson = {
        editor: draft.editorType,
        contentType: draft.editorType,
        content: String(editorContent),
      }
    }

    return {
      id: articleId,
      title,
      slug,
      category: draft.category,
      tags,
      summary: draft.summary,
      references,
      createdAt: article?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      contentBlocks: [
        {
          id: `block-${Date.now()}`,
          type: 'paragraph',
          order: 1,
          rawJson,
        },
      ],
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
          value={draft.category}
          onChange={(_, value) => setDraft((prev) => ({ ...prev, category: value ?? '' }))}
          onInputChange={(_, value) => setDraft((prev) => ({ ...prev, category: value }))}
          renderInput={(params) => <TextField {...params} label="Category" />}
        />

        <TextField
          label="Title"
          value={draft.title}
          onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
        />

        <TextField
          label="Slug"
          value={draft.slug}
          onChange={(event) => setDraft((prev) => ({ ...prev, slug: event.target.value }))}
        />

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

        <FormControl fullWidth>
          <InputLabel id="editor-type-label">Editor Type</InputLabel>
          <Select
            labelId="editor-type-label"
            value={draft.editorType}
            label="Editor Type"
            onChange={(event) => {
              const newEditorType = event.target.value as EditorType
              setDraft((prev) => ({ ...prev, editorType: newEditorType }))
            }}
          >
            <MenuItem value="custom">Custom (Plain Text)</MenuItem>
            <MenuItem value="tiptap">Tiptap Editor</MenuItem>
            <MenuItem value="lexical">Lexical Editor</MenuItem>
          </Select>
        </FormControl>

        <Box>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Content ({draft.editorType} editor)
          </Typography>
          {draft.editorType === 'custom' && (
            <CustomEditor content={editorContent} onChange={handleEditorChange} editable={true} />
          )}
          {draft.editorType === 'tiptap' && (
            <TiptapEditor content={editorContent} onChange={handleEditorChange} editable={true} />
          )}
          {draft.editorType === 'lexical' && (
            <LexicalEditor content={editorContent} onChange={handleEditorChange} editable={true} />
          )}
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
