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
        {article.category_id.map((categoryId) => (
          <Chip key={categoryId} label={categoryId} color="primary" variant="filled" />
        ))}
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

      {Object.values(article.contentBlocks)
        .sort((a, b) => a.order - b.order)
        .flatMap((block) => block.contents.map((contentBlock) => ({ block, contentBlock })))
        .map(({ block, contentBlock }) => {
          const content = getBlockText(contentBlock)
          const kind = getEditorType(contentBlock.contents)

          return (
            <Box key={`${block.id}-${contentBlock.id}`} sx={{ mb: 2 }}>
              <EditorRenderer kind={kind} content={content || block.type} rawJson={contentBlock.contents} />
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
