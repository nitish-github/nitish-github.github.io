import re
import sqlite3
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status

from app.db import get_db
from app.services.auth import AuthenticatedUser, get_active_user


def require_user(
    authorization: Annotated[str | None, Header()] = None,
    connection: sqlite3.Connection = Depends(get_db),
) -> AuthenticatedUser:
    token = (
        re.sub(r"^Bearer\s+", "", authorization, count=1, flags=re.IGNORECASE)
        if authorization
        else None
    )
    user = get_active_user(connection, token)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Login required"
        )
    return user
