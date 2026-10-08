import sqlite3
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from app.security import create_session_token, verify_password


@dataclass(frozen=True)
class AuthenticatedUser:
    id: str
    email: str
    token: str


def authenticate(
    connection: sqlite3.Connection, email: str, password: str
) -> AuthenticatedUser | None:
    user = connection.execute(
        "SELECT id, email, password_hash FROM users WHERE email = ?",
        (email.strip().lower(),),
    ).fetchone()
    if user is None or not verify_password(password, user["password_hash"]):
        return None

    token = create_session_token()
    expires_at = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(
        timespec="milliseconds"
    ).replace("+00:00", "Z")
    connection.execute(
        "INSERT INTO sessions (token, user_id, expiresAt) VALUES (?, ?, ?)",
        (token, user["id"], expires_at),
    )
    return AuthenticatedUser(user["id"], user["email"], token)


def get_active_user(
    connection: sqlite3.Connection, token: str | None
) -> AuthenticatedUser | None:
    if not token:
        return None
    session = connection.execute(
        """
        SELECT users.id, users.email, sessions.token, sessions.expiresAt
        FROM sessions JOIN users ON users.id = sessions.user_id
        WHERE sessions.token = ?
        """,
        (token,),
    ).fetchone()
    if session is None:
        return None

    expires_at = datetime.fromisoformat(session["expiresAt"].replace("Z", "+00:00"))
    if expires_at <= datetime.now(timezone.utc):
        connection.execute("DELETE FROM sessions WHERE token = ?", (token,))
        return None
    return AuthenticatedUser(session["id"], session["email"], session["token"])
