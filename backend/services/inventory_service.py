def handle_restock(get_connection, parsed):

    conn = get_connection()
    cur  = conn.cursor()

    product_name = parsed.get("product", "")
    quantity     = int(parsed.get("quantity", 1))
    price        = parsed.get("price") or 0

    if quantity <= 0:
        cur.close(); conn.close()
        return {"message": "Quantity must be greater than zero.", "type": "error"}

    try:
        # 1) Try exact case-insensitive match
        cur.execute(
            "SELECT id, name FROM products WHERE LOWER(name)=LOWER(%s) LIMIT 1",
            (product_name,)
        )
        existing = cur.fetchone()

        # 2) Fallback: partial match — catches "Safeguard" → "Safeguard Soap 135g"
        if not existing:
            cur.execute(
                "SELECT id, name FROM products WHERE LOWER(name) LIKE LOWER(%s) LIMIT 1",
                (f"%{product_name}%",)
            )
            existing = cur.fetchone()

        if existing:
            cur.execute(
                "UPDATE products SET stock = stock + %s WHERE id=%s",
                (quantity, existing[0])
            )
            if price > 0:
                cur.execute("UPDATE products SET price=%s WHERE id=%s", (price, existing[0]))
            conn.commit()
            return {"message": f"Stock updated: {existing[1]} (+{quantity})", "type": "success"}

        else:
            cur.execute(
                "INSERT INTO products (name, price, stock, image) VALUES (%s, %s, %s, %s)",
                (product_name, price, quantity, "")
            )
            conn.commit()
            price_note = f" at \u20b1{price}" if price > 0 else " (set price in Inventory)"
            return {"message": f"New product added: {product_name}{price_note}", "type": "success"}

    except Exception as e:
        conn.rollback()
        raise e

    finally:
        cur.close()
        conn.close()


def handle_check(get_connection, parsed):

    conn = get_connection()
    cur  = conn.cursor()

    product_name = parsed.get("product", "")

    try:
        cur.execute(
            "SELECT name, stock FROM products WHERE LOWER(name)=LOWER(%s) LIMIT 1",
            (product_name,)
        )
        result = cur.fetchone()

        if not result:
            cur.execute(
                "SELECT name, stock FROM products WHERE LOWER(name) LIKE LOWER(%s) LIMIT 1",
                (f"%{product_name}%",)
            )
            result = cur.fetchone()

        if not result:
            return {
                "message": f"Product '{product_name}' not found. Check the exact name in Inventory.",
                "type": "error"
            }

        return {"message": f"{result[0]} has {result[1]} in stock.", "type": "success"}

    finally:
        cur.close()
        conn.close()


def handle_remove(get_connection, product_query: str):
    """
    Remove a product from inventory by name (case-insensitive, partial match).
    product_query is the raw search string after stripping the trigger word.
    """
    conn = get_connection()
    cur  = conn.cursor()

    try:
        cur.execute(
            "SELECT id, name FROM products WHERE LOWER(name) = LOWER(%s) LIMIT 1",
            (product_query,)
        )
        row = cur.fetchone()

        if not row:
            cur.execute(
                "SELECT id, name FROM products WHERE LOWER(name) LIKE LOWER(%s) LIMIT 1",
                (f"%{product_query}%",)
            )
            row = cur.fetchone()

        if not row:
            return {
                "message": f"Hindi mahanap ang produktong '{product_query}'. Tingnan ang Inventory para sa tamang pangalan.",
                "type": "error"
            }

        product_id, product_name = row
        cur.execute("DELETE FROM products WHERE id = %s", (product_id,))
        conn.commit()

        return {
            "message": f"Na-remove na ang produktong {product_name} sa inventory.",
            "type": "success",
            "subtype": "remove_product"
        }

    except Exception as e:
        conn.rollback()
        raise e

    finally:
        cur.close()
        conn.close()