# SAFE MODE: No embeddings required (prevents crash)
# pgvector disabled until embeddings module is added

def find_similar_product(text, conn):
    """
    SAFE fallback: keyword search only
    (NO embeddings required)
    """

    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT name
            FROM products
            WHERE LOWER(name) LIKE %s
            LIMIT 1
        """, (f"%{text.lower()}%",))

        result = cur.fetchone()

        if result:
            return result[0]

        return None

    except Exception:
        return None

    finally:
        cur.close()