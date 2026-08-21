import { Fragment } from 'react'
import { Box, Typography } from '@mui/material'

export type LexicalReaderProps = {
  content?: string
  rawJson?: Record<string, unknown>
}

type LexicalNode = {
  type?: string
  text?: string
  children?: LexicalNode[]
  direction?: string
  format?: string | number
  indent?: number
  tag?: string
  listType?: 'bullet' | 'number'
  detail?: number
  mode?: string
  style?: string
  src?: string
  altText?: string
}

function renderLexicalText(node: LexicalNode | undefined): React.ReactNode {
  if (!node) return null

  if (typeof node.text === 'string') {
    const text = node.text
    const format = node.format ?? 0
    const isBold = typeof format === 'number' ? (format & 1) !== 0 : format.includes('bold') || format.includes('1')
    const isItalic = typeof format === 'number' ? (format & 2) !== 0 : format.includes('italic')
    const isStrikethrough = typeof format === 'number' ? (format & 4) !== 0 : format.includes('strikethrough')
    const isCode = typeof format === 'number' ? (format & 16) !== 0 : format.includes('code')

    let rendered: React.ReactNode = text
    if (isCode) rendered = <code>{rendered}</code>
    if (isStrikethrough) rendered = <s>{rendered}</s>
    if (isItalic) rendered = <em>{rendered}</em>
    if (isBold) rendered = <strong>{rendered}</strong>
    return rendered
  }

  return (node.children ?? []).map((child, index) => <Fragment key={`lexical-text-${index}`}>{renderLexicalText(child)}</Fragment>)
}

function renderLexicalNode(node: LexicalNode | undefined, index: number): React.ReactNode {
  if (!node) return null

  if (node.type === 'text') {
    return <Fragment key={`lexical-text-${index}`}>{renderLexicalText(node)}</Fragment>
  }

  if (node.type === 'paragraph') {
    return (
      <Typography key={`lexical-paragraph-${index}`} variant="body1" sx={{ mb: 1.5, lineHeight: 1.8 }}>
        {(node.children ?? []).map((child, childIndex) => renderLexicalNode(child, childIndex))}
      </Typography>
    )
  }

  if (node.type === 'heading') {
    const level = Number(node.tag?.replace('h', '') ?? 2)
    const variant = level === 1 ? 'h4' : level === 2 ? 'h5' : level === 3 ? 'h6' : 'h6'
    return (
      <Typography key={`lexical-heading-${index}`} variant={variant} sx={{ mt: 2, mb: 1 }}>
        {(node.children ?? []).map((child, childIndex) => renderLexicalNode(child, childIndex))}
      </Typography>
    )
  }

  if (node.type === 'quote') {
    return (
      <Box key={`lexical-quote-${index}`} component="blockquote" sx={{ borderLeft: 3, borderColor: 'primary.main', pl: 2, my: 2, color: 'text.secondary' }}>
        {(node.children ?? []).map((child, childIndex) => renderLexicalNode(child, childIndex))}
      </Box>
    )
  }

  if (node.type === 'code') {
    return (
      <Box key={`lexical-code-${index}`} component="pre" sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, overflow: 'auto', my: 2 }}>
        {(node.children ?? []).map((child, childIndex) => renderLexicalNode(child, childIndex))}
      </Box>
    )
  }

  if (node.type === 'list') {
    const isOrdered = node.listType === 'number'
    const ListTag = isOrdered ? 'ol' : 'ul'

    return (
      <ListTag key={`lexical-list-${index}`} style={{ margin: '0 0 16px 1.5rem', paddingLeft: '1rem' }}>
        {(node.children ?? []).map((child, childIndex) => (
          <li key={`lexical-li-${childIndex}`}>{renderLexicalNode(child, childIndex)}</li>
        ))}
      </ListTag>
    )
  }

  if (node.type === 'listitem') {
    return (
      <Fragment key={`lexical-listitem-${index}`}>
        {(node.children ?? []).map((child, childIndex) => renderLexicalNode(child, childIndex))}
      </Fragment>
    )
  }

  if (node.type === 'linebreak') {
    return <br key={`lexical-br-${index}`} />
  }

  if (node.type === 'image' && typeof node.src === 'string') {
    return <Box key={`lexical-image-${index}`} component="img" src={node.src} alt={node.altText ?? ''} sx={{ display: 'block', maxWidth: '100%', my: 2 }} />
  }

  return (
    <Fragment key={`lexical-unknown-${index}`}>
      {(node.children ?? []).map((child, childIndex) => renderLexicalNode(child, childIndex))}
    </Fragment>
  )
}

export function LexicalReader({ content, rawJson }: LexicalReaderProps) {
  const data = (rawJson ?? {}) as Record<string, unknown>
  const root = data.root as Record<string, unknown> | undefined
  const children = Array.isArray(root?.children) ? (root.children as LexicalNode[]) : Array.isArray(data.children) ? (data.children as LexicalNode[]) : []

  if (children.length === 0) {
    return (
      <Box sx={{ lineHeight: 1.8 }}>
        <Typography variant="body1">{content || 'Lexical content'}</Typography>
      </Box>
    )
  }

  return <Box sx={{ lineHeight: 1.8 }}>{children.map((node, index) => renderLexicalNode(node, index))}</Box>
}
