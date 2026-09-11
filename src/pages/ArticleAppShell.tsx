import { Button, Box, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Drawer, FormControlLabel, IconButton, List, ListItemButton, ListItemText, Menu, MenuItem, Stack, Switch, TextField, Toolbar, Typography } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { firebaseAuth } from '../database/firebase'
import { useAuth } from '../auth/useAuth'
import type { Article, CategoryId } from '../types/article'
import { fetchCategories, fetchCategoryArticles, fetchMyArticles, getCachedCategoryArticles, getDataSourceMode } from '../database/articleRepository'

export function ArticleAppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const { category, slug } = useParams()
  const [staticCategories, setStaticCategories] = useState<CategoryId[]>([])
  const [myCategories, setMyCategories] = useState<CategoryId[]>([])
  const [staticArticlesByCategory, setStaticArticlesByCategory] = useState<Record<CategoryId, Article[]>>({})
  const [myArticlesByCategory, setMyArticlesByCategory] = useState<Record<CategoryId, Article[]>>({})
  const [mobileOpen, setMobileOpen] = useState(false)
  const [email, setEmail] = useState('demo@example.com')
  const [password, setPassword] = useState('password123')
  const [authError, setAuthError] = useState<string | null>(null)
  const [firebaseUser, setFirebaseUser] = useState(firebaseAuth.currentUser)
  const [loginOpen, setLoginOpen] = useState(false)
  const [accountMenuAnchor, setAccountMenuAnchor] = useState<null | HTMLElement>(null)
  const { user: localUser, login: localLogin, logout: localLogout, themeMode, setThemeMode } = useAuth()
  const isSqliteMode = getDataSourceMode() === 'sqlite'
  const isMyArticles = location.pathname.startsWith('/my-articles/')
  const selectedCategory = (category as CategoryId) || staticCategories[0] || ''
  const user = isSqliteMode ? localUser : firebaseUser

  useEffect(() => {
    const unsubscribe = firebaseAuth.onAuthStateChanged((nextUser) => {
      setFirebaseUser(nextUser)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const load = async () => {
      const availableCategories = await fetchCategories()
      setStaticCategories(availableCategories)
      for (const item of availableCategories) {
        const cached = await getCachedCategoryArticles(item)
        if (cached) {
          setStaticArticlesByCategory((prev) => ({ ...prev, [item]: cached }))
        }

        try {
          const refreshed = await fetchCategoryArticles(item)
          setStaticArticlesByCategory((prev) => ({ ...prev, [item]: refreshed }))
        } catch {
          // keep cached or empty state
        }
      }

      try {
        const myArticles = await fetchMyArticles()
        setMyCategories([...new Set(myArticles.flatMap((article) => article.category_id))].sort())
        setMyArticlesByCategory(
          myArticles.reduce<Record<CategoryId, Article[]>>((grouped, article) => {
            for (const articleCategory of article.category_id) {
              grouped[articleCategory] = [...(grouped[articleCategory] ?? []), article]
            }
            return grouped
          }, {}),
        )
      } catch {
        // database articles are optional when the API is unavailable
      }
    }

    void load()
  }, [category, isSqliteMode, localUser?.id, firebaseUser?.uid])

  const visibleArticles = useMemo(
    () => (isMyArticles ? myArticlesByCategory[selectedCategory] : staticArticlesByCategory[selectedCategory]) ?? [],
    [isMyArticles, myArticlesByCategory, selectedCategory, staticArticlesByCategory],
  )

  const currentArticle = useMemo(
    () => visibleArticles.find((article) => article.slug === slug) ?? visibleArticles[0] ?? null,
    [slug, visibleArticles],
  )

  useEffect(() => {
    const availableCategories = isMyArticles ? myCategories : staticCategories
    if (category && availableCategories.includes(category as CategoryId) && !slug && currentArticle && currentArticle.category_id.includes(selectedCategory)) {
      navigate(`${isMyArticles ? '/my-articles/' : '/'}${selectedCategory}/${currentArticle.slug}`, { replace: true })
    }
  }, [category, currentArticle, isMyArticles, myCategories, navigate, selectedCategory, slug, staticCategories])

  const handleLogin = async () => {
    try {
      if (isSqliteMode) await localLogin(email, password)
      else await signInWithEmailAndPassword(firebaseAuth, email, password)
      setAuthError(null)
      setLoginOpen(false)
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Authentication failed')
    }
  }

  const handleLogout = async () => {
    if (isSqliteMode) await localLogout()
    else await signOut(firebaseAuth)
    setAccountMenuAnchor(null)
  }

  const renderArticleList = (articles: Article[]) => (
    <List>
      {articles.map((article) => (
        <ListItemButton
          key={article.id}
          selected={currentArticle?.id === article.id}
          onClick={() => {
            setMobileOpen(false)
            navigate(`${isMyArticles ? '/my-articles/' : '/'}${selectedCategory}/${article.slug}`)
          }}
          sx={{ borderRadius: 2, mb: 1 }}
        >
          <ListItemText primary={article.title} secondary={article.summary} />
        </ListItemButton>
      ))}
    </List>
  )

  const drawer = (
    <Box sx={{ width: 300, p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Articles</Typography>
      <List>
        {staticCategories.map((item) => (
          <ListItemButton key={item} selected={!isMyArticles && selectedCategory === item} onClick={() => {
            setMobileOpen(false)
            const first = staticArticlesByCategory[item]?.[0]
            navigate(first ? `/${item}/${first.slug}` : `/${item}`)
          }} sx={{ borderRadius: 2, mb: 1 }}>
            <ListItemText primary={item} />
          </ListItemButton>
        ))}
      </List>

      <Divider sx={{ my: 2 }} />

      <Typography variant="h6" sx={{ mb: 2 }}>My Articles</Typography>
      <List>
        {myCategories.map((item) => (
          <ListItemButton key={item} selected={isMyArticles && selectedCategory === item} onClick={() => {
            setMobileOpen(false)
            const first = myArticlesByCategory[item]?.[0]
            navigate(first ? `/my-articles/${item}/${first.slug}` : `/my-articles/${item}`)
          }} sx={{ borderRadius: 2, mb: 1 }}>
            <ListItemText primary={item} />
          </ListItemButton>
        ))}
      </List>

      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle2" sx={{ mb: 1 }}>{selectedCategory} articles</Typography>
      {renderArticleList(visibleArticles)}
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
            {isSqliteMode && user && (
              <Button variant="contained" size="small" onClick={() => navigate('/user', { state: { article: null } })}>
                New article
              </Button>
            )}
            <IconButton
              aria-label="Open account menu"
              onClick={(event) => setAccountMenuAnchor(event.currentTarget)}
              aria-controls={accountMenuAnchor ? 'account-menu' : undefined}
              aria-haspopup="true"
            >
              <MenuIcon />
            </IconButton>
            <Menu
              id="account-menu"
              anchorEl={accountMenuAnchor}
              open={Boolean(accountMenuAnchor)}
              onClose={() => setAccountMenuAnchor(null)}
            >
              {user ? <MenuItem disabled>{user.email}</MenuItem> : null}
              {user ? (
                <MenuItem onClick={() => void handleLogout()}>Log out</MenuItem>
              ) : (
                <MenuItem onClick={() => { setAccountMenuAnchor(null); setLoginOpen(true) }}>Log in</MenuItem>
              )}
              <MenuItem>
                <FormControlLabel
                  control={<Switch checked={themeMode === 'dark'} onChange={(event) => setThemeMode(event.target.checked ? 'dark' : 'light')} />}
                  label="Dark mode"
                />
              </MenuItem>
            </Menu>
          </Stack>
        </Toolbar>

        {authError && (
          <Box sx={{ p: 2 }}>
            <Typography color="error">{authError}</Typography>
          </Box>
        )}

        <Dialog open={loginOpen} onClose={() => setLoginOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>{isSqliteMode ? 'Log in' : 'Firebase login'}</DialogTitle>
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
