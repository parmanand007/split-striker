import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from dotenv import load_dotenv

# Load .env from backend/ directory regardless of where the process is started
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

DATABASE_URL = os.environ.get("DATABASE_URL")

if DATABASE_URL:
    # SQLAlchemy requires postgresql:// not postgres://
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    # Force psycopg2 driver (SQLAlchemy 2.1+ defaults to psycopg3 otherwise)
    if DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)
    engine = create_engine(DATABASE_URL)
else:
    # Local default: SQLite file next to the backend package
    db_path = os.path.join(os.path.dirname(__file__), "..", "split-striker.db")
    engine = create_engine(
        f"sqlite:///{os.path.abspath(db_path)}",
        connect_args={"check_same_thread": False},
    )
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
        "ALTER TABLE groups ADD COLUMN budget NUMERIC(14, 2)",
        "ALTER TABLE groups ADD COLUMN category_budgets JSON",
        "ALTER TABLE users ADD COLUMN avatar_updated_at DATETIME",
    ]
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                pass  # column already exists
