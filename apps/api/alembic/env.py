"""Alembic environment — async, autogenerate from ORM metadata."""
import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import settings
from app.db import Base
from app import models  # noqa: F401  register models on metadata

config = context.config
if config.config_file_name:
    fileConfig(config.config_file_name)

# Prefer the app's DATABASE_URL over the static alembic.ini value.
config.set_main_option("sqlalchemy.url", settings.database_url)
target_metadata = Base.metadata


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations():
    engine = create_async_engine(settings.database_url)
    async with engine.connect() as conn:
        await conn.run_sync(do_run_migrations)
    await engine.dispose()


def run_migrations_online():
    asyncio.run(run_async_migrations())


run_migrations_online()
