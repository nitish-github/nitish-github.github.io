import { Box } from '@mui/material'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type Props = {
  content: string
}

export function MarkdownReader({ content }: Props) {
  return (
    <Box
      sx={{
        lineHeight: 1.8,
        overflowWrap: 'anywhere',
        '& h1, & h2, & h3, & h4': { lineHeight: 1.3, mt: 3, mb: 1 },
        '& p, & ul, & ol, & blockquote, & table': { mb: 2 },
        '& pre': { overflowX: 'auto', p: 2, borderRadius: 1, bgcolor: 'action.hover' },
        '& code': { fontFamily: 'monospace' },
        '& blockquote': { ml: 0, pl: 2, borderLeft: 3, borderColor: 'divider', color: 'text.secondary' },
        '& table': { display: 'block', overflowX: 'auto', borderCollapse: 'collapse' },
        '& th, & td': { border: 1, borderColor: 'divider', p: 1, textAlign: 'left' },
        '& img': { maxWidth: '100%' },
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </Box>
  )
}
