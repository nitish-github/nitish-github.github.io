import { Box, Typography } from '@mui/material'

export type CustomReaderProps = {
  content: string
}

export function CustomReader({ content }: CustomReaderProps) {
  return (
    <Box sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
      <Typography variant="body1">{content}</Typography>
    </Box>
  )
}
