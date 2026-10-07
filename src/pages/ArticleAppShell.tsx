import { Button, Box, Collapse, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Drawer, FormControlLabel, IconButton, List, ListItemButton, ListItemText, Menu, MenuItem, Stack, Switch, TextField, Toolbar, Typography } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { firebaseAuth } from '../database/firebase'
import { useAuth } from '../auth/useAuth'
import type { Article, CategoryId, CategoryManifestItem } from '../types/article'
import { fetchCategories, fetchCategoryArticles, fetchCategoryTree, fetchMyArticles, getCachedCategoryArticles, getDataSourceMode } from '../database/articleRepository'

export function ArticleAppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const { category, slug } = useParams()
  const [staticCategories, setStaticCategories] = useState<CategoryId[]>([])
  const [staticCategoryTree, setStaticCategoryTree] = useState<CategoryManifestItem[]>([])
  const [myCategories, setMyCategories] = useState<CategoryId[]>([])
  const [staticArticlesByCategory, setStaticArticlesByCategory] = useState<Record<CategoryId, Article[]>>({})
  const [myArticlesByCategory, setMyArticlesByCategory] = useState<Record<CategoryId, Article[]>>({})
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})
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
      const [availableCategories, categoryTree] = await Promise.all([fetchCategories(), fetchCategoryTree()])
      setStaticCategories(availableCategories)
      setStaticCategoryTree(categoryTree)
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

  const { firstLevelCategory, visibleArticles } = useMemo(() => {
    if (isMyArticles) {
      return {
        firstLevelCategory: selectedCategory,
        visibleArticles: myArticlesByCategory[selectedCategory] ?? [],
      }
    }

    let selectedNode: CategoryManifestItem | undefined
    let firstLevelNode: CategoryManifestItem | undefined
    const findCategory = (
      categories: CategoryManifestItem[],
      root?: CategoryManifestItem,
    ): CategoryManifestItem | undefined => {
      for (const item of categories) {
        const currentRoot = root ?? item
        if (item.category_id === selectedCategory) {
          selectedNode = item
          firstLevelNode = currentRoot
          return item
        }
        const found = item.categories && findCategory(item.categories, currentRoot)
        if (found) return found
      }
      return undefined
    }

    findCategory(staticCategoryTree)
    const collectArticles = (item: CategoryManifestItem): Article[] => [
      ...(staticArticlesByCategory[item.category_id] ?? []),
      ...(item.categories ?? []).flatMap(collectArticles),
    ]

    return {
      firstLevelCategory: firstLevelNode?.category_id ?? selectedCategory,
      visibleArticles: selectedNode ? collectArticles(selectedNode) : [],
    }
  }, [isMyArticles, myArticlesByCategory, selectedCategory, staticArticlesByCategory, staticCategoryTree])

  const currentArticle = useMemo(
    () => slug ? visibleArticles.find((article) => article.slug === slug) ?? null : category ? null : visibleArticles[0] ?? null,
    [category, slug, visibleArticles],
  )

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

  const renderCategoryTree = (
    categories: CategoryManifestItem[],
    articlesByCategory: Record<CategoryId, Article[]>,
    section: 'static' | 'my',
    depth = 0,
  ) => (
    <List disablePadding>
      {categories.map((item) => {
        const key = `${section}:${item.category_id}`
        const articles = articlesByCategory[item.category_id] ?? []
        const children = item.categories ?? []
        const expandable = children.length > 0 || articles.length > 0
        const expanded = expandedCategories[key] ?? (depth === 0 || selectedCategory === item.category_id)

        return (
          <Box key={item.category_id}>
            <ListItemButton
              selected={section === (isMyArticles ? 'my' : 'static') && selectedCategory === item.category_id}
              onClick={() => {
                setMobileOpen(false)
                navigate(`${section === 'my' ? '/my-articles/' : '/'}${item.category_id}`)
              }}
              sx={{ borderRadius: 1, minHeight: 40, pl: 2 + depth * 2 }}
            >
              <ListItemText primary={item.category_id} />
              {expandable && (
                <IconButton
                  size="small"
                  aria-label={`${expanded ? 'Collapse' : 'Expand'} ${item.category_id}`}
                  aria-expanded={expanded}
                  onClick={(event) => {
                    event.stopPropagation()
                    setExpandedCategories((previous) => ({ ...previous, [key]: !expanded }))
                  }}
                  sx={{ mr: -1 }}
                >
                  {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                </IconButton>
              )}
            </ListItemButton>
            {expandable && (
              <Collapse in={expanded} timeout="auto" unmountOnExit>
                {children.length > 0
                  ? renderCategoryTree(children, articlesByCategory, section, depth + 1)
                  : (
                    <List disablePadding>
                      {articles.map((article) => (
                        <ListItemButton
                          key={article.id}
                          selected={currentArticle?.id === article.id}
                          onClick={() => {
                            setMobileOpen(false)
                            navigate(`${section === 'my' ? '/my-articles/' : '/'}${item.category_id}/${article.slug}`)
                          }}
                          sx={{ pl: 4 + depth * 2, borderRadius: 1, minHeight: 36 }}
                        >
                          <ListItemText primary={article.title} sx={{ '& .MuiListItemText-primary': { typography: 'body2' } }} />
                        </ListItemButton>
                      ))}
                    </List>
                  )}
              </Collapse>
            )}
          </Box>
        )
      })}
    </List>
  )

  const drawer = (
    <Box sx={{ width: 300, p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Articles</Typography>
      {renderCategoryTree(staticCategoryTree, staticArticlesByCategory, 'static')}

      <Divider sx={{ my: 2 }} />

      <Typography variant="h6" sx={{ mb: 2 }}>My Articles</Typography>
      {renderCategoryTree(
        myCategories.map((category_id) => ({ category_id, description: '', articleIds: [] })),
        myArticlesByCategory,
        'my',
      )}
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

        <Outlet context={{ article: currentArticle, category: selectedCategory, firstLevelCategory, articles: visibleArticles, isMyArticles }} />
      </Box>
    </Box>
  )
}
