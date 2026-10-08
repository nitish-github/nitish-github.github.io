import { Box } from '@mui/material'
import EasyMDE from 'easymde'
import { useEffect, useRef } from 'react'
import 'easymde/dist/easymde.min.css'

type Props = {
  content: string
  onChange: (content: string) => void
}

export function MarkdownEditor({ content, onChange }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const editorRef = useRef<EasyMDE | null>(null)
  const onChangeRef = useRef(onChange)
  const initialContentRef = useRef(content)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const editor = new EasyMDE({
      element: textarea,
      initialValue: initialContentRef.current,
      spellChecker: false,
      status: false,
      minHeight: '240px',
    })
    editorRef.current = editor
    editor.codemirror.on('change', () => onChangeRef.current(editor.value()))

    return () => {
      editor.toTextArea()
      editorRef.current = null
    }
  }, [])

  useEffect(() => {
    const editor = editorRef.current
    if (editor && editor.value() !== content) {
      editor.value(content)
    }
  }, [content])

  return (
    <Box sx={{ '& .EasyMDEContainer': { color: 'text.primary' } }}>
      <textarea ref={textareaRef} aria-label="Markdown content" />
    </Box>
  )
}
