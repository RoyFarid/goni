import psycopg2
import psycopg2.extras
from contextlib import contextmanager
from config import get_settings

settings = get_settings()


def get_connection():
    """Returns a raw psycopg2 connection."""
    return psycopg2.connect(settings.database_url)


@contextmanager
def get_db():
    """Context manager for DB sessions with auto-commit/rollback."""
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def dict_cursor(conn):
    """Returns a cursor that yields dicts instead of tuples."""
    return conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
