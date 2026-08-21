import { useEffect } from 'react'
import { useRef } from 'react'
import { Box, IconButton, Stack, Tooltip } from '@mui/material'
import {
  Code,
  FormatBold,
  FormatItalic,
  Image as ImageIcon,
} from '@mui/icons-material'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'

export type TiptapEditorProps = {
  content?: string | Record<string, unknown>
  onChange?: (value: Record<string, unknown>) => void
  editable?: boolean
}

function normalizeTiptapContent(input?: string | Record<string, unknown>): Record<string, unknown> {
  if (!input) {
    return {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Start writing here...' }],
        },
      ],
    }
  }

  if (typeof input === 'string') {
    return {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: input }],
        },
      ],
    }
  }

  return input
}

export function TiptapEditor({ content, onChange, editable = true }: TiptapEditorProps) {
  const imageInputRef = useRef<HTMLInputElement>(null)
  const editor = useEditor({
    extensions: [StarterKit, Image.configure({ allowBase64: true })],
    editable,
    content: normalizeTiptapContent(content),
    editorProps: {
      handlePaste: (_, event) => {
        const image = Array.from(event.clipboardData?.files ?? []).find((file) => file.type.startsWith('image/'))
        if (!image) return false

        const reader = new FileReader()
        reader.onload = () => {
          if (typeof reader.result !== 'string') return
          editor?.commands.setImage({ src: reader.result, alt: image.name })
        }
        reader.readAsDataURL(image)
        return true
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON() as Record<string, unknown>)
    },
  })

  useEffect(() => {
    if (!editor) return
    editor.setEditable(editable)

    const nextContent = normalizeTiptapContent(content)
    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(nextContent)) {
      editor.commands.setContent(nextContent, { emitUpdate: false })
    }
  }, [content, editable, editor])

  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        p: 2,
        minHeight: 220,
        '& .ProseMirror': {
          outline: 'none',
          minHeight: 180,
        },
      }}
    >
      <Stack direction="row" spacing={0.5} sx={{ mb: 1, borderBottom: 1, borderColor: 'divider', pb: 1 }}>
        <Tooltip title="Bold">
          <IconButton size="small" disabled={!editable || !editor} onClick={() => editor?.chain().focus().toggleBold().run()}>
            <FormatBold fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Italic">
          <IconButton size="small" disabled={!editable || !editor} onClick={() => editor?.chain().focus().toggleItalic().run()}>
            <FormatItalic fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Code">
          <IconButton size="small" disabled={!editable || !editor} onClick={() => editor?.chain().focus().toggleCode().run()}>
            <Code fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Insert image">
          <IconButton size="small" disabled={!editable || !editor} onClick={() => imageInputRef.current?.click()}>
            <ImageIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (!file || !editor) return
            const reader = new FileReader()
            reader.onload = () => {
              if (typeof reader.result === 'string') editor.chain().focus().setImage({ src: reader.result, alt: file.name }).run()
            }
            reader.readAsDataURL(file)
            event.target.value = ''
          }}
        />
      </Stack>
      <EditorContent editor={editor} />
    </Box>
  )
}
