from __future__ import annotations

from sqlalchemy.engine import make_url


def get_async_database_url(database_url: str) -> str:
    """Return a DATABASE_URL suitable for SQLAlchemy async engines."""
    url = make_url(database_url)
    if url.drivername == "postgresql":
        return url.set(drivername="postgresql+asyncpg").render_as_string(
            hide_password=False
        )
    return database_url


def get_sync_database_url(database_url: str) -> str:
    """Return a DATABASE_URL suitable for synchronous migration engines."""
    url = make_url(database_url)
    if url.drivername == "postgresql+asyncpg":
        return url.set(drivername="postgresql").render_as_string(
            hide_password=False
        )
    return database_url
