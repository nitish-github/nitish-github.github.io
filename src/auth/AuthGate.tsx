import { Alert, Box, Button, Stack, Typography } from '@mui/material'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { useState } from 'react'
import { firebaseAuth } from '../database/firebase'
import { getDataSourceMode } from '../database/articleRepository'

type Props = {
  children: React.ReactNode
}

export function AuthGate({ children }: Props) {
  const [email, setEmail] = useState('demo@example.com')
  const [password, setPassword] = useState('password123')
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState(firebaseAuth.currentUser)

  if (getDataSourceMode() === 'sqlite') {
    return <>{children}</>
  }

  firebaseAuth.onAuthStateChanged((nextUser) => {
    setUser(nextUser)
  })

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    }
  }

  if (user) {
    return (
      <Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'flex-end', mb: 2 }}>
          <Typography variant="body2">{user.email}</Typography>
          <Button variant="outlined" size="small" onClick={() => signOut(firebaseAuth)}>
            Sign out
          </Button>
        </Stack>
        {children}
      </Box>
    )
  }

  return (
    <Box sx={{ maxWidth: 420, mx: 'auto', p: 4 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Firebase login required
      </Typography>
      <Stack spacing={2}>
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid #cbd5e1' }}
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid #cbd5e1' }}
        />
        <Button variant="contained" onClick={handleLogin}>
          Sign in
        </Button>
        {error && <Alert severity="error">{error}</Alert>}
      </Stack>
    </Box>
  )
}
