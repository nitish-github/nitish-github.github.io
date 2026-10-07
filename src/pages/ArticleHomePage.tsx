import { Box, Button, Paper, Stack, Typography } from '@mui/material'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { ArticleList } from '../components/ArticleList'
import { ArticleReader } from '../components/ArticleReader'
import type { Article, CategoryId } from '../types/article'

type OutletContext = {
  article: Article | null
  category: CategoryId
  firstLevelCategory: CategoryId
  articles: Article[]
  isMyArticles: boolean
}

export function ArticleHomePage() {
  const navigate = useNavigate()
  const { article, category, firstLevelCategory, articles, isMyArticles } = useOutletContext<OutletContext>()

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
        {article ? (
          <ArticleReader article={article} />
        ) : (
          <Box>
            <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
              {firstLevelCategory}
            </Typography>
            {category !== firstLevelCategory && (
              <Typography variant="h6" component="h2" color="text.secondary" sx={{ mb: 2 }}>
                {category}
              </Typography>
            )}
            {articles.length > 0 ? (
              <ArticleList
                articles={articles}
                onSelect={(articleId) => {
                  const selectedArticle = articles.find((item) => item.id === articleId)
                  if (selectedArticle) {
                    navigate(`${isMyArticles ? '/my-articles/' : '/'}${category}/${selectedArticle.slug}`)
                  }
                }}
              />
            ) : (
              <Typography color="text.secondary">No articles in this category.</Typography>
            )}
          </Box>
        )}
      </Paper>
    </Box>
  )
}
