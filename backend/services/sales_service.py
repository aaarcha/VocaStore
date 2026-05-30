def handle_sale(db, parsed):

    conn = db()
    cur  = conn.cursor()

    quantity = parsed["quantity"]
    product  = parsed["product"]

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

        if stock < quantity:
            return {"message": f"Not enough stock for {prod_name}. Only {stock} left.", "type": "error"}

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

    finally:
        cur.close()
        conn.close()