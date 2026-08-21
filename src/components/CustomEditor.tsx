import { Box, TextField } from '@mui/material'

export type CustomEditorProps = {
  content?: string | Record<string, unknown>
  onChange?: (value: Record<string, unknown>) => void
  editable?: boolean
}

function normalizeCustomContent(input?: string | Record<string, unknown>): string {
  if (!input) return 'Start writing here...'

  if (typeof input === 'string') return input

  if (typeof input === 'object' && input !== null && 'text' in input) {
    return String(input.text)
  }

  return JSON.stringify(input, null, 2)
}

export function CustomEditor({ content, onChange, editable = true }: CustomEditorProps) {
  const text = normalizeCustomContent(content)

  const handleChange = (value: string) => {
    onChange?.({
      editor: 'custom',
      contentType: 'custom',
      text: value,
    })
  }

  return (
    <Box>
      <TextField
        multiline
        minRows={10}
        fullWidth
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        disabled={!editable}
        variant="outlined"
        placeholder="Start writing here..."
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
        }}
      />
    </Box>
  )
}
