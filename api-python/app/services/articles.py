import json
import re
import sqlite3
import time
from datetime import datetime, timezone
from typing import Any

from app.models import ArticlePayload


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace(
        "+00:00", "Z"
    )


def build_slug(title: str, article_id: str) -> str:
    normalized_title = re.sub(r"[^a-z0-9]+", "-", title.lower())
    return f"{normalized_title}-{article_id}".strip("-")


def normalize_article(row: sqlite3.Row | dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "title": row["title"],
        "slug": row["slug"],
        "category_id": json.loads(row["category_id"]),
        "tags": json.loads(row["tags"]),
        "summary": row["summary"],
        "references": json.loads(row["references"]),
        "createdAt": row["createdAt"],
        "updatedAt": row["updatedAt"],
        "contentBlocks": json.loads(row["contentBlocks"]),
    }


def list_articles(
    connection: sqlite3.Connection,
    owner_id: str | None = None,
    category: str | None = None,
) -> list[dict[str, Any]]:
    if owner_id is not None:
        rows = connection.execute(
            "SELECT * FROM articles WHERE owner_id = ? ORDER BY updatedAt DESC",
            (owner_id,),
        ).fetchall()
    elif category is not None:
        rows = connection.execute(
            """
            SELECT * FROM articles
            WHERE EXISTS (
                SELECT 1 FROM json_each(articles.category_id) WHERE value = ?
            )
            ORDER BY updatedAt DESC
            """,
            (category,),
        ).fetchall()
    else:
        rows = connection.execute(
            "SELECT * FROM articles ORDER BY updatedAt DESC"
        ).fetchall()
    return [normalize_article(row) for row in rows]


def get_article(
    connection: sqlite3.Connection, category: str, slug: str
) -> dict[str, Any] | None:
    row = connection.execute(
        """
        SELECT * FROM articles
        WHERE EXISTS (
            SELECT 1 FROM json_each(articles.category_id) WHERE value = ?
        ) AND slug = ?
        """,
        (category, slug),
    ).fetchone()
    return normalize_article(row) if row else None


def save_article(
    connection: sqlite3.Connection,
    payload: ArticlePayload,
    owner_id: str,
    article_id: str | None = None,
) -> tuple[dict[str, Any], int]:
    identifier = article_id or payload.id or str(int(time.time() * 1000))
    title = payload.title or "Untitled article"
    slug = build_slug(title, identifier)
    existing = connection.execute(
        "SELECT id, owner_id, createdAt FROM articles WHERE id = ?", (identifier,)
    ).fetchone()
    if existing and existing["owner_id"] != owner_id:
        return {"error": "Article belongs to another user"}, 403
    if article_id and not existing:
        return {"error": "Article not found"}, 404

    created_at = existing["createdAt"] if existing else payload.createdAt or now_iso()
    updated_at = now_iso() if article_id else payload.updatedAt or now_iso()
    values = (
        title,
        slug,
        json.dumps(payload.category_id),
        json.dumps(payload.tags),
        payload.summary,
        json.dumps(payload.references),
        updated_at,
        json.dumps(payload.contentBlocks),
    )
    if existing:
        connection.execute(
            """
            UPDATE articles
            SET title = ?, slug = ?, category_id = ?, tags = ?, summary = ?,
                "references" = ?, updatedAt = ?, contentBlocks = ?, owner_id = ?
            WHERE id = ? AND owner_id = ?
            """,
            (*values, owner_id, identifier, owner_id),
        )
    else:
        connection.execute(
            """
            INSERT INTO articles
                (id, owner_id, title, slug, category_id, tags, summary,
                 "references", createdAt, updatedAt, contentBlocks)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                identifier,
                owner_id,
                title,
                slug,
                json.dumps(payload.category_id),
                json.dumps(payload.tags),
                payload.summary,
                json.dumps(payload.references),
                created_at,
                updated_at,
                json.dumps(payload.contentBlocks),
            ),
        )
    return (
        {
            "id": identifier,
            "title": title,
            "slug": slug,
            "category_id": payload.category_id,
            "tags": payload.tags,
            "summary": payload.summary,
            "references": payload.references,
            "createdAt": created_at,
            "updatedAt": updated_at,
            "contentBlocks": payload.contentBlocks,
        },
        201 if not article_id else 200,
    )


def delete_article(
    connection: sqlite3.Connection, article_id: str, owner_id: str
) -> bool:
    cursor = connection.execute(
        "DELETE FROM articles WHERE id = ? AND owner_id = ?",
        (article_id, owner_id),
    )
    return cursor.rowcount > 0
