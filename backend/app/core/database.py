from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings


def ensure_database_exists() -> None:
    root_engine = create_engine(settings.root_database_url)
    with root_engine.connect() as conn:
        conn.execute(
            text(
                f"CREATE DATABASE IF NOT EXISTS {settings.DB_NAME} "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
            )
        )
        conn.commit()
    root_engine.dispose()


ensure_database_exists()

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def ensure_schema_migrations() -> None:
    with engine.connect() as conn:
        result = conn.execute(
            text(
                "SELECT COUNT(*) FROM information_schema.COLUMNS "
                "WHERE TABLE_SCHEMA = :db AND TABLE_NAME = 'vehicles' AND COLUMN_NAME = 'route_coordinates'"
            ),
            {"db": settings.DB_NAME},
        )
        if result.scalar() == 0:
            try:
                conn.execute(text("ALTER TABLE vehicles ADD COLUMN route_coordinates JSON NULL;"))
                conn.commit()
            except Exception:
                pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()