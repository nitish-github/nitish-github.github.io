import type { ReactNode } from 'react'
import { CustomReader } from './custom/CustomReader'
import { LexicalReader } from './lexical/LexicalReader'
import { TiptapReader } from './tiptap/TiptapReader'
import type { EditorType } from '../types/article'

type Props = {
  kind: EditorType
  content?: string
  rawJson?: Record<string, unknown>
}

export function EditorRenderer({ kind, content = '', rawJson = {} }: Props): ReactNode {
  switch (kind) {
    case 'tiptap':
      return <TiptapReader rawJson={rawJson} content={content} />
    case 'lexical':
      return <LexicalReader rawJson={rawJson} content={content} />
    case 'custom':
    default:
      return <CustomReader content={content} />
  }
}
