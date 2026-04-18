import types

import pytest
from fastapi import HTTPException
from sqlalchemy.exc import DBAPIError

from echo_backend.services import upload_jobs


def _connection_closed_error() -> DBAPIError:
    return DBAPIError(
        "SELECT upload_jobs.job_id FROM upload_jobs",
        {},
        Exception("connection was closed in the middle of operation"),
    )


@pytest.mark.asyncio
async def test_get_upload_job_retries_transient_connection_errors(monkeypatch):
    calls = {"count": 0}

    class RetryingSession:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def execute(self, *_args, **_kwargs):
            calls["count"] += 1
            if calls["count"] < 3:
                raise _connection_closed_error()
            return types.SimpleNamespace(scalar_one_or_none=lambda: types.SimpleNamespace(job_id="job-1"))

    monkeypatch.setattr(upload_jobs, "SessionLocal", lambda: RetryingSession())

    job = await upload_jobs.get_upload_job_or_404("job-1", "user-1")

    assert job.job_id == "job-1"
    assert calls["count"] == 3


@pytest.mark.asyncio
async def test_get_upload_job_returns_retryable_http_error_after_persistent_connection_failures(monkeypatch):
    class FailingSession:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def execute(self, *_args, **_kwargs):
            raise _connection_closed_error()

    monkeypatch.setattr(upload_jobs, "SessionLocal", lambda: FailingSession())

    with pytest.raises(HTTPException) as exc_info:
        await upload_jobs.get_upload_job_or_404("job-1", "user-1")

    assert exc_info.value.status_code == 503
    assert "temporarily unavailable" in exc_info.value.detail
