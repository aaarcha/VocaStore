def handle_restock(db, parsed):
    conn = db()
    cur = conn.cursor()

    cur.execute("""
        UPDATE products
        SET stock = stock + %s
        WHERE LOWER(name)=LOWER(%s)
    """, (parsed["quantity"], parsed["product"]))

    if cur.rowcount == 0:
        return {"error": "Product not found"}

    conn.commit()
    conn.close()

    return {"message": "Stock updated"}


def handle_check(db, parsed):
    conn = db()
    cur = conn.cursor()

    cur.execute("""
        SELECT stock FROM products
        WHERE LOWER(name)=LOWER(%s)
    """, (parsed["product"],))

    result = cur.fetchone()
    conn.close()

    if not result:
        return {"error": "Product not found"}

    return {
        "product": parsed["product"],
        "stock": result[0]
    }