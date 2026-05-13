# SAFE MODE: embeddings disabled (prevents import error)

from backend.db import get_connection


def run_backfill():
    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute("SELECT id, name FROM products")
        products = cur.fetchall()

        for p in products:
            product_id = p[0]
            name = p[1]

            # SAFE: no embeddings yet
            print(f"Skipping embedding for: {name}")

        conn.commit()

    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    run_backfill()