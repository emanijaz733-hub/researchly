"""Pydantic request/response schemas."""
import datetime as dt

from pydantic import BaseModel, EmailStr, Field


# ---- auth ----
class RegisterRequest(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str


# ---- search ----
class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)
    providers: list[str] | None = None  # None = all enabled providers


class ResultOut(BaseModel):
    id: str
    title: str
    url: str
    snippet: str
    provider: str
    score: float
    published_at: str | None = None


class ProviderStatus(BaseModel):
    name: str
    ok: bool
    latency_ms: int
    result_count: int
    error: str | None = None


# ---- bookmarks / collections ----
class BookmarkCreate(BaseModel):
    url: str
    title: str
    snippet: str = ""
    provider: str = ""
    note: str = ""
    collection_id: str | None = None


class BookmarkOut(BookmarkCreate):
    id: str
    created_at: dt.datetime


class CollectionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    workspace_id: str


class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class ConversationOut(BaseModel):
    id: str
    title: str
    created_at: dt.datetime
