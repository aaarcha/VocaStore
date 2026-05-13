import os
import psycopg2

def get_connection():
    return psycopg2.connect(
        host=os.getenv("postgres.railway.internal"),
        database=os.getenv("railway"),
        user=os.getenv("postgres"),
        password=os.getenv("ykuiSgkzVVPlSddFKWgBBLMhimNtnwYQ"),
        port=os.getenv("5432", 5432)
    )
    