def handle_sale(db, parsed):
    conn = db()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, stock, price
        FROM products
        WHERE LOWER(name)=LOWER(%s)
    """, (parsed["product"],))

    product = cur.fetchone()

    if not product:
        return {"error": "Product not found"}

    product_id, stock, price = product

    if stock < parsed["quantity"]:
        return {"error": "Not enough stock"}

    new_stock = stock - parsed["quantity"]
    total = parsed["quantity"] * price

    cur.execute("""
        UPDATE products SET stock=%s WHERE id=%s
    """, (new_stock, product_id))

    cur.execute("""
        INSERT INTO sales_transactions (product_id, quantity, total_price)
        VALUES (%s, %s, %s)
    """, (product_id, parsed["quantity"], total))

    conn.commit()
    conn.close()

    return {
        "message": f"Sold {parsed['quantity']} {parsed['product']}",
        "remaining_stock": new_stock
    }