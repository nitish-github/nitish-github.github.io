import { initializeApp } from 'firebase/app'
import { getAuth, type User } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'demo-api-key',
  authDomain: 'demo-project.firebaseapp.com',
  projectId: 'demo-project',
  storageBucket: 'demo-project.appspot.com',
  messagingSenderId: '1234567890',
  appId: '1:1234567890:web:demoapp',
}

export const firebaseApp = initializeApp(firebaseConfig)
export const firebaseAuth = getAuth(firebaseApp)
export const firebaseDb = getFirestore(firebaseApp)

export function isSignedIn(user: User | null): boolean {
  return Boolean(user)
}
