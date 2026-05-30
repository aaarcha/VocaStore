def handle_sale(get_connection, parsed):

    conn = get_connection()
    cur  = conn.cursor()

    quantity = int(parsed.get("quantity", 1))
    product  = parsed.get("product", "")

    try:
        # 1. Exact case-insensitive match
        cur.execute(
            "SELECT id, name, stock, price FROM products WHERE LOWER(name)=LOWER(%s) LIMIT 1",
            (product,)
        )
        item = cur.fetchone()

        # 2. Partial match fallback
        if not item:
            cur.execute(
                "SELECT id, name, stock, price FROM products WHERE LOWER(name) LIKE LOWER(%s) LIMIT 1",
                (f"%{product}%",)
            )
            item = cur.fetchone()

        if not item:
            return {"message": f"Product '{product}' not found.", "type": "error"}

        prod_id, prod_name, stock, price = item

        # FIX: validate quantity is positive
        if quantity <= 0:
            return {"message": "Quantity must be greater than zero.", "type": "error"}

        if stock < quantity:
            return {"message": f"Not enough stock for {prod_name}. Only {stock} left.", "type": "error"}

        # FIX: guard against zero-price sales
        if float(price) <= 0:
            return {"message": f"{prod_name} has no price set. Update the price in Inventory first.", "type": "error"}

        new_stock = stock - quantity
        total     = quantity * float(price)

        cur.execute("UPDATE products SET stock=%s WHERE id=%s", (new_stock, prod_id))
        cur.execute(
            "INSERT INTO sales_transactions (product_name, quantity, total_price) VALUES (%s, %s, %s)",
            (prod_name, quantity, total)
        )
        conn.commit()

        return {
            "message": f"Sold {quantity} {prod_name} for \u20b1{total:.2f}.",
            "type": "success"
        }

    except Exception as e:
        conn.rollback()
        raise e

    finally:
        cur.close()
        conn.close()