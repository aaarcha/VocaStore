def handle_restock(get_connection, parsed):

    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT id FROM products
            WHERE LOWER(name)=LOWER(%s)
            LIMIT 1
        """, (parsed["product"],))

        existing = cur.fetchone()

        if existing:
            cur.execute("""
                UPDATE products
                SET stock = stock + %s
                WHERE id=%s
            """, (parsed["quantity"], existing[0]))

            message = "Stock updated"

        else:
            cur.execute("""
                INSERT INTO products (name, price, stock)
                VALUES (%s, %s, %s)
            """, (parsed["product"], 0, parsed["quantity"]))

            message = "New product created"

        conn.commit()

        return {
            "message": f"{message}: {parsed['product']}",
            "type": "success"
        }

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