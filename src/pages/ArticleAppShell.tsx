import { Button, Box, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Drawer, IconButton, List, ListItemButton, ListItemText, Stack, TextField, Toolbar, Typography } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { useEffect, useMemo, useState } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router-dom'
import { firebaseAuth } from '../firebase/firebase'
import type { Article, CategoryId } from '../types/article'
import { fetchCategories, fetchCategoryArticles, getCachedCategoryArticles, getDataSourceMode } from '../services/articleRepository'

export function ArticleAppShell() {
  const navigate = useNavigate()
  const { category, slug } = useParams()
  const [categories, setCategories] = useState<CategoryId[]>([])
  const [articlesByCategory, setArticlesByCategory] = useState<Record<CategoryId, Article[]>>({})
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>((category as CategoryId) || '')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [email, setEmail] = useState('demo@example.com')
  const [password, setPassword] = useState('password123')
  const [authError, setAuthError] = useState<string | null>(null)
  const [user, setUser] = useState(firebaseAuth.currentUser)
  const [loginOpen, setLoginOpen] = useState(false)
  const isSqliteMode = getDataSourceMode() === 'sqlite'

  useEffect(() => {
    const unsubscribe = firebaseAuth.onAuthStateChanged((nextUser) => {
      setUser(nextUser)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const load = async () => {
      const availableCategories = await fetchCategories()
      setCategories(availableCategories)
      if (!category && availableCategories[0]) {
        setSelectedCategory(availableCategories[0])
      }

      for (const item of availableCategories) {
        const cached = await getCachedCategoryArticles(item)
        if (cached) {
          setArticlesByCategory((prev) => ({ ...prev, [item]: cached }))
        }

        try {
          const refreshed = await fetchCategoryArticles(item)
          setArticlesByCategory((prev) => ({ ...prev, [item]: refreshed }))
        } catch {
          // keep cached or empty state
        }
      }
    }

    void load()
  }, [category])

  useEffect(() => {
    if (category && categories.includes(category as CategoryId)) {
      setSelectedCategory(category as CategoryId)
    }
  }, [categories, category])

  const visibleArticles = useMemo(() => articlesByCategory[selectedCategory] ?? [], [articlesByCategory, selectedCategory])

  const currentArticle = useMemo(
    () => visibleArticles.find((article) => article.slug === slug) ?? visibleArticles[0] ?? null,
    [slug, visibleArticles],
  )

  useEffect(() => {
    if (category && categories.includes(category as CategoryId) && !slug && currentArticle && currentArticle.category_id.includes(selectedCategory)) {
      navigate(`/${selectedCategory}/${currentArticle.slug}`, { replace: true })
    }
  }, [category, currentArticle, navigate, selectedCategory, slug])

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password)
      setAuthError(null)
      setLoginOpen(false)
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Authentication failed')
    }
  }

  const drawer = (
    <Box sx={{ width: 300, p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Categories
      </Typography>
      <List>
        {categories.map((item) => (
          <ListItemButton
            key={item}
            selected={selectedCategory === item}
            onClick={() => {
              setSelectedCategory(item)
              setMobileOpen(false)
              const first = articlesByCategory[item]?.[0]
              if (first) {
                navigate(`/${item}/${first.slug}`)
              } else {
                navigate(`/${item}`)
              }
            }}
            sx={{ borderRadius: 2, mb: 1 }}
          >
            <ListItemText primary={item} />
          </ListItemButton>
        ))}
      </List>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {selectedCategory} articles
      </Typography>

      <List>
        {visibleArticles.map((article) => (
          <ListItemButton
            key={article.id}
            selected={currentArticle?.id === article.id}
            onClick={() => {
              setMobileOpen(false)
              navigate(`/${selectedCategory}/${article.slug}`)
            }}
            sx={{ borderRadius: 2, mb: 1 }}
          >
            <ListItemText primary={article.title} secondary={article.summary} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Box component="nav" sx={{ display: { xs: 'none', md: 'block' }, width: 320, borderRight: 1, borderColor: 'divider' }}>
        {drawer}
      </Box>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: 'block', md: 'none' } }}
      >
        {drawer}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0 }}>
        <Toolbar sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <IconButton sx={{ display: { xs: 'flex', md: 'none' } }} onClick={() => setMobileOpen(true)}>
              <MenuIcon />
            </IconButton>
            <Typography variant="h6">Article app</Typography>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            {isSqliteMode && (
              <Button variant="contained" size="small" onClick={() => navigate('/admin', { state: { article: null } })}>
                New article
              </Button>
            )}

            {user ? (
              <>
                <Typography variant="body2">{user.email}</Typography>
                {!isSqliteMode && (
                  <Button variant="contained" size="small" onClick={() => navigate('/admin')}>
                    Add article
                  </Button>
                )}
                <Button variant="outlined" size="small" onClick={() => signOut(firebaseAuth)}>
                  Sign out
                </Button>
              </>
            ) : (
              !isSqliteMode && (
                <Button variant="contained" size="small" onClick={() => setLoginOpen(true)}>
                  Login
                </Button>
              )
            )}
          </Stack>
        </Toolbar>

        {authError && (
          <Box sx={{ p: 2 }}>
            <Typography color="error">{authError}</Typography>
          </Box>
        )}

        <Dialog open={loginOpen} onClose={() => setLoginOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Firebase login</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                label="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                fullWidth
              />
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                fullWidth
              />
              {authError && <Typography color="error">{authError}</Typography>}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setLoginOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleLogin}>Sign in</Button>
          </DialogActions>
        </Dialog>

        <Outlet context={{ article: currentArticle, category: selectedCategory }} />
      </Box>
    </Box>
  )
}
