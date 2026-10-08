import sqlite3
from contextlib import closing
from pathlib import Path
from typing import Generator

from app.core.config import get_settings


def connect(database_path: Path | None = None) -> sqlite3.Connection:
    path = database_path or get_settings().resolved_database_path
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA busy_timeout = 10000")
    return connection


def get_db() -> Generator[sqlite3.Connection, None, None]:
    connection = connect()
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def initialize_database() -> None:
    with closing(connect()) as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                createdAt TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                expiresAt TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS user_preferences (
                user_id TEXT PRIMARY KEY,
                theme TEXT NOT NULL DEFAULT 'light',
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS articles (
                id TEXT PRIMARY KEY,
                owner_id TEXT,
                title TEXT NOT NULL,
                slug TEXT NOT NULL,
                category_id TEXT NOT NULL,
                tags TEXT NOT NULL,
                summary TEXT NOT NULL,
                "references" TEXT NOT NULL,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL,
                contentBlocks TEXT NOT NULL
            );
            """
        )
        article_columns = {
            row["name"] for row in connection.execute("PRAGMA table_info(articles)")
        }
        if "owner_id" not in article_columns:
            connection.execute("ALTER TABLE articles ADD COLUMN owner_id TEXT")
        if "category" in article_columns and "category_id" not in article_columns:
            connection.execute(
                'ALTER TABLE articles ADD COLUMN category_id TEXT NOT NULL DEFAULT "[]"'
            )
            connection.execute(
                "UPDATE articles SET category_id = json_array(category)"
            )
        connection.commit()
