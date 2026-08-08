import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./split-striker.db")

# SQLAlchemy requires postgresql:// not postgres://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

_is_sqlite = DATABASE_URL.startswith("sqlite")
connect_args = {"check_same_thread": False} if _is_sqlite else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def run_migrations():
    """Add new columns to existing tables without losing data."""
    migrations = [
        "ALTER TABLE groups ADD COLUMN created_by_id INTEGER REFERENCES users(id)",
        "ALTER TABLE groups ADD COLUMN emoji TEXT",
        "ALTER TABLE users ADD COLUMN avatar_color TEXT",
        "ALTER TABLE expenses ADD COLUMN notes TEXT",
        "ALTER TABLE users ADD COLUMN password_hash TEXT",
    ]
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                pass  # column already exists
