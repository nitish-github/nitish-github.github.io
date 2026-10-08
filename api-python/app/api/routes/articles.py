import json
import sqlite3
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response

from app.api.dependencies import require_user
from app.db import get_db
from app.models import ArticlePayload
from app.services.articles import (
    delete_article,
    get_article,
    list_articles,
    save_article,
)
from app.services.auth import AuthenticatedUser


router = APIRouter(tags=["articles"])


@router.get("/api/categories")
def categories(
    connection: Annotated[sqlite3.Connection, Depends(get_db)],
) -> dict[str, list[str]]:
    rows = connection.execute("SELECT category_id FROM articles").fetchall()
    names = {
        category for row in rows for category in json.loads(row["category_id"])
    }
    return {"categories": sorted(names)}


@router.get("/api/articles")
def all_articles(
    connection: Annotated[sqlite3.Connection, Depends(get_db)],
) -> dict:
    return {"articles": list_articles(connection)}


@router.get("/api/my/articles")
def my_articles(
    user: Annotated[AuthenticatedUser, Depends(require_user)],
    connection: Annotated[sqlite3.Connection, Depends(get_db)],
) -> dict:
    return {"articles": list_articles(connection, owner_id=user.id)}


@router.get("/api/articles/{category}/{slug}")
def article_by_slug(
    category: str,
    slug: str,
    connection: Annotated[sqlite3.Connection, Depends(get_db)],
) -> dict:
    article = get_article(connection, category, slug)
    if article is None:
        raise HTTPException(status_code=404, detail="Article not found")
    return article


@router.get("/api/articles/{category}")
def articles_by_category(
    category: str,
    connection: Annotated[sqlite3.Connection, Depends(get_db)],
) -> dict:
    return {"articles": list_articles(connection, category=category)}


@router.post("/api/articles")
def create_article(
    payload: ArticlePayload,
    user: Annotated[AuthenticatedUser, Depends(require_user)],
    connection: Annotated[sqlite3.Connection, Depends(get_db)],
    response: Response,
) -> dict:
    article, status_code = save_article(connection, payload, user.id)
    if status_code >= 400:
        raise HTTPException(status_code=status_code, detail=article["error"])
    response.status_code = status_code
    return article


@router.put("/api/articles/{article_id}")
def update_article(
    article_id: str,
    payload: ArticlePayload,
    user: Annotated[AuthenticatedUser, Depends(require_user)],
    connection: Annotated[sqlite3.Connection, Depends(get_db)],
) -> dict:
    article, status_code = save_article(
        connection, payload, user.id, article_id=article_id
    )
    if status_code >= 400:
        raise HTTPException(status_code=status_code, detail=article["error"])
    return article


@router.delete("/api/articles/{article_id}")
def remove_article(
    article_id: str,
    user: Annotated[AuthenticatedUser, Depends(require_user)],
    connection: Annotated[sqlite3.Connection, Depends(get_db)],
) -> dict[str, str | bool]:
    if not delete_article(connection, article_id, user.id):
        raise HTTPException(status_code=404, detail="Article not found")
    return {"success": True, "id": article_id}
