import { Box, Chip, Divider, Link, List, ListItem, Stack, Typography } from '@mui/material'
import { EditorRenderer } from './EditorRenderer'
import { getBlockText, getEditorType } from '../lib/editorAdapters'
import type { Article } from '../types/article'

type Props = {
  article: Article | null
}

export function ArticleReader({ article }: Props) {
  if (!article) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6">Select an article</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3, maxWidth: 860, mx: 'auto' }}>
      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
        <Chip label={article.category} color="primary" variant="filled" />
        {article.tags.map((tag) => (
          <Chip key={tag} label={tag} variant="outlined" />
        ))}
      </Stack>

      <Typography variant="h3" sx={{ mb: 2 }}>
        {article.title}
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        {article.summary}
      </Typography>

      <Divider sx={{ my: 3 }} />

      {article.contentBlocks
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((block) => {
          const content = getBlockText(block)
          const kind = getEditorType(block.rawJson)

          if (block.type === 'heading') {
            return (
              <Box key={block.id} sx={{ mt: 3, mb: 2 }}>
                {kind === 'custom' ? (
                  <Typography variant="h5">{content || 'Heading'}</Typography>
                ) : (
                  <EditorRenderer kind={kind} content={content || 'Heading'} rawJson={block.rawJson} />
                )}
              </Box>
            )
          }

          return (
            <Box key={block.id} sx={{ mb: 2 }}>
              <EditorRenderer kind={kind} content={content || 'Paragraph'} rawJson={block.rawJson} />
            </Box>
          )
        })}

      {article.references.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            References
          </Typography>
          <List dense>
            {article.references.map((reference) => (
              <ListItem key={reference.url} disableGutters>
                <Link href={reference.url} target="_blank" rel="noreferrer">
                  {reference.label}
                </Link>
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </Box>
  )
}
