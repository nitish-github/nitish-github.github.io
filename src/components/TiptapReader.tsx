import { Box } from '@mui/material'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'

export type TiptapReaderProps = {
  content?: string
  rawJson?: Record<string, unknown>
}

function normalizeDocument(input?: Record<string, unknown> | string): Record<string, unknown> {
  if (!input) {
    return {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Tiptap content' }] }],
    }
  }

  if (typeof input === 'string') {
    return {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: input }] }],
    }
  }

  if (input.type === 'doc') {
    return input
  }

  return {
    type: 'doc',
    content: Array.isArray(input.content)
      ? input.content
      : [{ type: 'paragraph', content: [{ type: 'text', text: String(input.text ?? '') }] }],
  }
}

export function TiptapReader({ content, rawJson }: TiptapReaderProps) {
  const editor = useEditor({
    extensions: [StarterKit, Image.configure({ allowBase64: true })],
    editable: false,
    content: normalizeDocument(rawJson ?? content),
    immediatelyRender: false,
  })

  return (
    <Box
      sx={{
        '& .ProseMirror': {
          outline: 'none',
          lineHeight: 1.8,
          color: 'text.primary',
        },
      }}
    >
      <EditorContent editor={editor} />
    </Box>
  )
}
