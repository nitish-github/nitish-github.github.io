import { collection, deleteDoc, doc, getDocs, query, setDoc, where } from 'firebase/firestore'
import type { Article, CategoryId } from '../types/article'
import { firebaseDb } from '../firebase/firebase'

export async function fetchArticlesFromFirebase(category?: CategoryId): Promise<Article[]> {
  try {
    const articlesCollection = collection(firebaseDb, 'articles')
    const snapshot = category
      ? await getDocs(query(articlesCollection, where('category_id', 'array-contains', category)))
      : await getDocs(articlesCollection)

    return snapshot.docs.map((docSnapshot) => docSnapshot.data() as Article)
  } catch {
    return []
  }
}

export async function fetchArticleByIdFromFirebase(id: string): Promise<Article | null> {
  try {
    const articles = await fetchArticlesFromFirebase()
    return articles.find((article) => article.id === id) ?? null
  } catch {
    return null
  }
}

export async function saveArticleToFirebase(article: Article): Promise<Article> {
  const articlesCollection = collection(firebaseDb, 'articles')
  await setDoc(doc(articlesCollection, article.id), article)
  return article
}

export async function deleteArticleFromFirebase(articleId: string): Promise<void> {
  const articlesCollection = collection(firebaseDb, 'articles')
  await deleteDoc(doc(articlesCollection, articleId))
}
