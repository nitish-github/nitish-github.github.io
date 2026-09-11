import { Box, Button, Paper, Stack } from '@mui/material'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { ArticleReader } from '../components/ArticleReader'
import type { Article, CategoryId } from '../types/article'

type OutletContext = {
  article: Article | null
  category: CategoryId
}

export function ArticleHomePage() {
  const navigate = useNavigate()
  const { article } = useOutletContext<OutletContext>()

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" sx={{ mb: 2, justifyContent: 'flex-end' }}>
        {article && (
          <Button variant="contained" onClick={() => navigate('/user', { state: { article } })}>
            Edit article
          </Button>
        )}
      </Stack>

      <Paper sx={{ minHeight: 'calc(100vh - 120px)', p: 2 }}>
        <ArticleReader article={article} />
      </Paper>
    </Box>
  )
}
