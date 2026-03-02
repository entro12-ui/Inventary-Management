from __future__ import annotations

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.config import settings
from app.database import Base

# Ensure all tables are registered on Base.metadata for autogenerate.
import app.models.full_schema  # noqa: F401


config = context.config

if config.config_file_name is not None:
	fileConfig(config.config_file_name)

config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

target_metadata = Base.metadata


def include_object(object, name, type_, reflected, compare_to):  # noqa: ANN001
	"""Exclude unrelated existing DB objects from autogenerate.

	If the database already contains tables from another app, Alembic would
	otherwise try to generate DROP statements for them. We only want to manage
	objects that are part of our SQLAlchemy metadata.
	"""
	if reflected and compare_to is None and type_ in {
		"table",
		"index",
		"unique_constraint",
		"foreign_key_constraint",
	}:
		return False
	return True


def run_migrations_offline() -> None:
	url = config.get_main_option("sqlalchemy.url")
	context.configure(
		url=url,
		target_metadata=target_metadata,
		include_object=include_object,
		version_table="alembic_version_easystock",
		literal_binds=True,
		dialect_opts={"paramstyle": "named"},
		compare_type=True,
	)

	with context.begin_transaction():
		context.run_migrations()


def run_migrations_online() -> None:
	connectable = engine_from_config(
		config.get_section(config.config_ini_section, {}),
		prefix="sqlalchemy.",
		poolclass=pool.NullPool,
	)

	with connectable.connect() as connection:
		context.configure(
			connection=connection,
			target_metadata=target_metadata,
			include_object=include_object,
			version_table="alembic_version_easystock",
			compare_type=True,
		)

		with context.begin_transaction():
			context.run_migrations()


if context.is_offline_mode():
	run_migrations_offline()
else:
	run_migrations_online()
