import { Box, Stack, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ArticleEditor } from '../components/ArticleEditor'
import type { Article } from '../types/article'

export function AdminPage() {
  const location = useLocation()
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)

  useEffect(() => {
    const incomingArticle = (location.state as { article?: Article | null } | null)?.article ?? null
    if (incomingArticle) {
      setSelectedArticle(incomingArticle)
      return
    }

    // If location.state explicitly has article: null, clear to create new
    if (location.state && (location.state as { article?: Article | null }).article === null) {
      setSelectedArticle(null)
      return
    }
  }, [location.state])

  return (
    <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Admin console
      </Typography>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        <Box sx={{ flex: 1 }}>
          <ArticleEditor
            mode={selectedArticle ? 'edit' : 'create'}
            article={selectedArticle}
            onSaved={(article) => {
              setSelectedArticle(article)
            }}
            onDeleted={() => {
              setSelectedArticle(null)
            }}
          />
        </Box>
      </Stack>
    </Box>
  )
}
