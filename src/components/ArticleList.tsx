import { List, ListItemButton, ListItemText, Typography } from '@mui/material'
import type { Article } from '../types/article'

type Props = {
  articles: Article[]
  selectedId?: string
  onSelect: (articleId: string) => void
}

export function ArticleList({ articles, selectedId, onSelect }: Props) {
  return (
    <List disablePadding>
      {articles.map((article) => (
        <ListItemButton
          key={article.id}
          selected={selectedId === article.id}
          onClick={() => onSelect(article.id)}
          sx={{ borderRadius: 2, mb: 1 }}
        >
          <ListItemText
            primary={article.title}
            secondary={
              <>
                <Typography variant="caption" color="text.secondary">
                  {article.tags.join(' · ')}
                </Typography>
              </>
            }
          />
        </ListItemButton>
      ))}
    </List>
  )
}
