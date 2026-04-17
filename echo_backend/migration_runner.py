from __future__ import annotations

import asyncio
import os
from pathlib import Path

from alembic import command
from alembic.config import Config


def should_run_startup_migrations() -> bool:
    return os.getenv("RUN_STARTUP_MIGRATIONS", "true").lower() not in {"0", "false", "no"}


def _build_alembic_config() -> Config:
    backend_dir = Path(__file__).resolve().parent
    repo_root = backend_dir.parent
    config = Config(str(backend_dir / "alembic.ini"))
    config.set_main_option("script_location", str(backend_dir / "migrations"))
    config.set_main_option("prepend_sys_path", str(repo_root))
    return config


async def run_startup_migrations() -> None:
    if not should_run_startup_migrations():
        return

    config = _build_alembic_config()
    await asyncio.to_thread(command.upgrade, config, "head")
