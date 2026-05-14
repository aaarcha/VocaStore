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
        return {"message": "Product not found", "type": "error"}

    product_id, stock, price = product
    quantity = parsed["quantity"] or 1

    if stock < quantity:
        return {"message": "Not enough stock", "type": "error"}

    new_stock = stock - quantity
    total = quantity * float(price)

    cur.execute("""
        UPDATE products
        SET stock=%s
        WHERE id=%s
    """, (new_stock, product_id))

    cur.execute("""
        INSERT INTO sales_transactions (product_id, quantity, total_price)
        VALUES (%s, %s, %s)
    """, (product_id, quantity, total))

    conn.commit()
    conn.close()

    return {
        "message": f"Sold {quantity} {parsed['product']}",
        "type": "success"
    }