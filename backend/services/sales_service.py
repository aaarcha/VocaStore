def handle_sale(db, parsed):

    conn = db()
    cur = conn.cursor()

    quantity = parsed["quantity"]
    product = parsed["product"]

    cur.execute("""
        SELECT stock, price
        FROM products
        WHERE LOWER(name)=LOWER(%s)
    """, (product,))

    item = cur.fetchone()

    if not item:
        conn.close()
        return {"message": "Product not found"}

    stock, price = item

    if stock < quantity:
        conn.close()
        return {"message": "Not enough stock"}

    new_stock = stock - quantity
    total = quantity * float(price)

    cur.execute("""
        UPDATE products
        SET stock=%s
        WHERE LOWER(name)=LOWER(%s)
    """, (new_stock, product))

    cur.execute("""
        INSERT INTO sales_transactions
        (product_name, quantity, total_price)
        VALUES (%s, %s, %s)
    """, (product, quantity, total))

    conn.commit()

    cur.close()
    conn.close()

    return {
        "message": f"Sold {quantity} {product}"
    }