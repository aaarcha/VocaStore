import os
import psycopg2
from psycopg2.extras import RealDictCursor

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

def get_connection():
    """
    Return a psycopg2 connection.
    FIX: added connect_timeout so hung DB connections fail fast instead of
    blocking a request thread indefinitely, and sslmode=require for Railway.
    """
    return psycopg2.connect(
        host=os.getenv("PGHOST"),
        database=os.getenv("PGDATABASE"),
        user=os.getenv("PGUSER"),
        password=os.getenv("PGPASSWORD"),
        port=os.getenv("PGPORT"),
        connect_timeout=10,
        sslmode=os.getenv("PGSSLMODE", "require"),
    )