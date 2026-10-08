import type { ReactNode } from 'react'
import { Suspense, lazy } from 'react'
import type { EditorType } from '../types/article'

const CustomReader = lazy(async () => {
  const module = await import('./custom/CustomReader')
  return { default: module.CustomReader }
})

const LexicalReader = lazy(async () => {
  const module = await import('./lexical/LexicalReader')
  return { default: module.LexicalReader }
})

const TiptapReader = lazy(async () => {
  const module = await import('./tiptap/TiptapReader')
  return { default: module.TiptapReader }
})

const MarkdownReader = lazy(async () => {
  const module = await import('./markdown/MarkdownReader')
  return { default: module.MarkdownReader }
})

type Props = {
  kind: EditorType
  content?: string
  rawJson?: Record<string, unknown>
}

export function EditorRenderer({ kind, content = '', rawJson = {} }: Props): ReactNode {
  const fallback = <div>Loading reader...</div>

  switch (kind) {
    case 'tiptap':
      return (
        <Suspense fallback={fallback}>
          <TiptapReader rawJson={rawJson} content={content} />
        </Suspense>
      )
    case 'lexical':
      return (
        <Suspense fallback={fallback}>
          <LexicalReader rawJson={rawJson} content={content} />
        </Suspense>
      )
    case 'markdown':
      return (
        <Suspense fallback={fallback}>
          <MarkdownReader content={content} />
        </Suspense>
      )
    case 'custom':
    default:
      return (
        <Suspense fallback={fallback}>
          <CustomReader content={content} />
        </Suspense>
      )
  }
}
