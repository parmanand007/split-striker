import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from dotenv import load_dotenv

# Load .env from backend/ directory regardless of where the process is started
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

DATABASE_URL = os.environ["DATABASE_URL"]

# SQLAlchemy requires postgresql:// not postgres://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
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
