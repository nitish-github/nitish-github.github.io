from typing import Any

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    email: str = Field(max_length=320)
    password: str = Field(max_length=1024)


class ThemePreference(BaseModel):
    theme: str = "light"


class ArticlePayload(BaseModel):
    id: str | None = None
    title: str = "Untitled article"
    category_id: list[str] = Field(default_factory=list)
    tags: list[Any] = Field(default_factory=list)
    summary: str = ""
    references: list[Any] = Field(default_factory=list)
    createdAt: str | None = None
    updatedAt: str | None = None
    contentBlocks: list[Any] = Field(default_factory=list)
