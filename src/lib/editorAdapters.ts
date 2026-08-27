import type { contentBlock, EditorType } from '../types/article'

export type ContentSourceKey = EditorType

type EditorTextSource = {
  text?: string
  content?: Array<{ type?: string; text?: string; content?: EditorTextSource[] }>
  children?: Array<{ type?: string; text?: string; children?: EditorTextSource[] }>
  root?: { children?: EditorTextSource[] }
}

export function getContentType(rawJson: Record<string, unknown> | undefined): ContentSourceKey {
  const value = rawJson?.contentType ?? rawJson?.editor
  const source = typeof value === 'string' ? value.toLowerCase() : ''

  if (source === 'tiptap' || source === 'lexical' || source === 'custom') return source
  if (rawJson && typeof rawJson.type === 'string' && rawJson.type === 'doc') return 'tiptap'
  if (rawJson && ('root' in rawJson || 'children' in rawJson)) return 'lexical'
  return 'custom'
}

export function getEditorType(rawJson: Record<string, unknown> | undefined): EditorType {
  return getContentType(rawJson) as EditorType
}

export function getBlockText(block: contentBlock): string {
  const raw = block.contents as EditorTextSource & {
    editor?: EditorType | string
    type?: string
    text?: string
  }

  if (typeof raw.text === 'string' && raw.text.trim()) {
    return raw.text
  }

  const visited = new Set<object>()

  const walk = (value: unknown): string => {
    if (!value || typeof value !== 'object') return ''
    if (visited.has(value as object)) return ''
    visited.add(value as object)

    if (Array.isArray(value)) {
      return value.map(walk).filter(Boolean).join(' ')
    }

    const record = value as Record<string, unknown>
    if (typeof record.text === 'string' && record.text.trim()) {
      return record.text
    }

    const nested = [record.content, record.children, record.root]
      .flatMap((item) => {
        if (Array.isArray(item)) return item
        if (item && typeof item === 'object') return [item]
        return []
      })
      .map(walk)
      .filter(Boolean)

    if (nested.length > 0) {
      return nested.join(' ')
    }

    return Object.values(record)
      .map(walk)
      .filter(Boolean)
      .join(' ')
  }

  return walk(raw).trim()
}
