import sqlite3
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import require_user
from app.db import get_db
from app.models import LoginRequest, ThemePreference
from app.services.auth import AuthenticatedUser, authenticate


router = APIRouter(prefix="/api/auth", tags=["auth"])


def get_preferences(connection: sqlite3.Connection, user_id: str) -> dict[str, str]:
    preference = connection.execute(
        "SELECT theme FROM user_preferences WHERE user_id = ?", (user_id,)
    ).fetchone()
    return {"theme": preference["theme"] if preference else "light"}


@router.post("/login")
def login(
    payload: LoginRequest,
    connection: Annotated[sqlite3.Connection, Depends(get_db)],
) -> dict:
    user = authenticate(connection, payload.email, payload.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {
        "user": {"id": user.id, "email": user.email},
        "token": user.token,
        "preferences": get_preferences(connection, user.id),
    }


@router.get("/me")
def me(
    user: Annotated[AuthenticatedUser, Depends(require_user)],
    connection: Annotated[sqlite3.Connection, Depends(get_db)],
) -> dict:
    return {
        "user": {"id": user.id, "email": user.email},
        "preferences": get_preferences(connection, user.id),
    }


@router.post("/logout")
def logout(
    user: Annotated[AuthenticatedUser, Depends(require_user)],
    connection: Annotated[sqlite3.Connection, Depends(get_db)],
) -> dict[str, bool]:
    connection.execute("DELETE FROM sessions WHERE token = ?", (user.token,))
    return {"success": True}


@router.put("/preferences")
def save_preferences(
    payload: ThemePreference,
    user: Annotated[AuthenticatedUser, Depends(require_user)],
    connection: Annotated[sqlite3.Connection, Depends(get_db)],
) -> dict[str, str]:
    theme = "dark" if payload.theme == "dark" else "light"
    connection.execute(
        """
        INSERT INTO user_preferences (user_id, theme) VALUES (?, ?)
        ON CONFLICT(user_id) DO UPDATE SET theme = excluded.theme
        """,
        (user.id, theme),
    )
    return {"theme": theme}
