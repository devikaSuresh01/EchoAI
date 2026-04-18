import types

import pytest
from fastapi import FastAPI
from sqlalchemy.exc import ProgrammingError

from echo_backend.services import upload_jobs


def _missing_upload_jobs_error() -> ProgrammingError:
    return ProgrammingError(
        "SELECT upload_jobs.job_id FROM upload_jobs",
        {},
        Exception('relation "upload_jobs" does not exist'),
    )


@pytest.mark.asyncio
async def test_resume_upload_jobs_requires_migration_when_auto_create_disabled(monkeypatch):
    app = FastAPI()
    app.state.upload_job_tasks = {}

    monkeypatch.setenv("AUTO_CREATE_UPLOAD_JOBS_TABLE", "false")

    class FailingSession:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def execute(self, *_args, **_kwargs):
            raise _missing_upload_jobs_error()

    monkeypatch.setattr(upload_jobs, "SessionLocal", lambda: FailingSession())

    with pytest.raises(RuntimeError, match="alembic -c echo_backend/alembic.ini upgrade head"):
        await upload_jobs.resume_upload_jobs(app)


@pytest.mark.asyncio
async def test_resume_upload_jobs_auto_creates_table_when_enabled(monkeypatch):
    app = FastAPI()
    app.state.upload_job_tasks = {}
    calls = {"execute": 0, "create": 0}

    monkeypatch.setenv("AUTO_CREATE_UPLOAD_JOBS_TABLE", "true")

    class SessionAfterBootstrap:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def execute(self, *_args, **_kwargs):
            calls["execute"] += 1
            if calls["execute"] == 1:
                raise _missing_upload_jobs_error()
            return types.SimpleNamespace(scalars=lambda: types.SimpleNamespace(all=lambda: []))

    async def fake_create_upload_jobs_table():
        calls["create"] += 1

    monkeypatch.setattr(upload_jobs, "SessionLocal", lambda: SessionAfterBootstrap())
    monkeypatch.setattr(upload_jobs, "_create_upload_jobs_table", fake_create_upload_jobs_table)

    await upload_jobs.resume_upload_jobs(app)

    assert calls["create"] == 1
    assert calls["execute"] == 2


@pytest.mark.asyncio
async def test_resume_upload_jobs_skips_bootstrap_when_table_exists(monkeypatch):
    app = FastAPI()
    app.state.upload_job_tasks = {}
    calls = {"create": 0}

    monkeypatch.setenv("AUTO_CREATE_UPLOAD_JOBS_TABLE", "true")

    class ReadySession:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def execute(self, *_args, **_kwargs):
            return types.SimpleNamespace(scalars=lambda: types.SimpleNamespace(all=lambda: []))

    async def fake_create_upload_jobs_table():
        calls["create"] += 1

    monkeypatch.setattr(upload_jobs, "SessionLocal", lambda: ReadySession())
    monkeypatch.setattr(upload_jobs, "_create_upload_jobs_table", fake_create_upload_jobs_table)

    await upload_jobs.resume_upload_jobs(app)

    assert calls["create"] == 0


@pytest.mark.asyncio
async def test_resume_upload_jobs_reraises_non_missing_table_errors(monkeypatch):
    app = FastAPI()
    app.state.upload_job_tasks = {}

    monkeypatch.setenv("AUTO_CREATE_UPLOAD_JOBS_TABLE", "true")

    class FailingSession:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def execute(self, *_args, **_kwargs):
            raise ProgrammingError("SELECT 1", {}, Exception("permission denied for relation upload_jobs"))

    monkeypatch.setattr(upload_jobs, "SessionLocal", lambda: FailingSession())

    with pytest.raises(ProgrammingError, match="permission denied"):
        await upload_jobs.resume_upload_jobs(app)
