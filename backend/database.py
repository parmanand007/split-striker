from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase

SQLALCHEMY_DATABASE_URL = "sqlite:///./splitease.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
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
    ]
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                pass  # column already exists
