def handle_restock(get_connection, parsed):

    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            UPDATE products
            SET stock = stock + %s
            WHERE LOWER(name)=LOWER(%s)
        """, (parsed["quantity"], parsed["product"]))

        if cur.rowcount == 0:
            return {"message": "Product not found", "type": "error"}

        conn.commit()

        return {"message": "Stock updated", "type": "success"}

    finally:
        cur.close()
        conn.close()


def handle_check(get_connection, parsed):

    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT stock FROM products
            WHERE LOWER(name)=LOWER(%s)
            LIMIT 1
        """, (parsed["product"],))

        result = cur.fetchone()

        if not result:
            return {"message": "Product not found", "type": "error"}

        return {
            "message": f"{parsed['product']} has {result[0]} in stock",
            "type": "success"
        }

    finally:
        cur.close()
        conn.close()