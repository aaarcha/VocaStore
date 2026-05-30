def handle_restock(get_connection, parsed):

    conn = get_connection()
    cur  = conn.cursor()

    product_name = parsed["product"]
    quantity     = parsed["quantity"]
    price        = parsed.get("price") or 0

    try:
        # Case-insensitive exact match first
        cur.execute("""
            SELECT id, name FROM products
            WHERE LOWER(name)=LOWER(%s)
            LIMIT 1
        """, (product_name,))

        existing = cur.fetchone()

        if existing:
            cur.execute("""
                UPDATE products
                SET stock = stock + %s
                WHERE id=%s
            """, (quantity, existing[0]))

            # Update price if one was provided
            if price > 0:
                cur.execute(
                    "UPDATE products SET price=%s WHERE id=%s",
                    (price, existing[0])
                )

            conn.commit()

            return {
                "message": f"Stock updated: {existing[1]} (+{quantity})",
                "type": "success"
            }

        else:
            # New product — preserve original casing, use price if given
            cur.execute("""
                INSERT INTO products (name, price, stock, image)
                VALUES (%s, %s, %s, %s)
            """, (product_name, price, quantity, ""))

            conn.commit()

            price_note = f" at \u20b1{price}" if price > 0 else " (set price in Inventory)"
            return {
                "message": f"New product added: {product_name}{price_note}",
                "type": "success"
            }

    finally:
        cur.close()
        conn.close()


def handle_check(get_connection, parsed):

    conn = get_connection()
    cur  = conn.cursor()

    product_name = parsed["product"]

    try:
        # 1. Exact case-insensitive match
        cur.execute("""
            SELECT name, stock FROM products
            WHERE LOWER(name)=LOWER(%s)
            LIMIT 1
        """, (product_name,))

        result = cur.fetchone()

        # 2. Partial/contains match fallback
        if not result:
            cur.execute("""
                SELECT name, stock FROM products
                WHERE LOWER(name) LIKE LOWER(%s)
                LIMIT 1
            """, (f"%{product_name}%",))
            result = cur.fetchone()

        if not result:
            return {
                "message": f"Product '{product_name}' not found. Check the exact name in Inventory.",
                "type": "error"
            }

        return {
            "message": f"{result[0]} has {result[1]} in stock.",
            "type": "success"
        }

    finally:
        cur.close()
        conn.close()