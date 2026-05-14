from backend.services.ai_brain import parse_command

def handle_command(command: str, get_connection):

    parsed = parse_command(command)

    intent = parsed.get("intent")
    product = parsed.get("product")
    quantity = parsed.get("quantity") or 1

    if not product:
        return {
            "message": "Wala akong maintindihang product.",
            "type": "error"
        }

    product = product.lower().strip()

    conn = get_connection()
    cur = conn.cursor()

    try:

        if intent == "SALE":

            cur.execute("""
                SELECT id, stock, price FROM products
                WHERE LOWER(name) LIKE %s
                LIMIT 1
            """, (f"%{product}%",))

            item = cur.fetchone()

            if not item:
                return {"message": "Product not found", "type": "error"}

            product_id, stock, price = item

            if stock < quantity:
                return {"message": "Not enough stock", "type": "error"}

            new_stock = stock - quantity

            cur.execute("""
                UPDATE products
                SET stock=%s
                WHERE id=%s
            """, (new_stock, product_id))

            total = quantity * float(price)

            cur.execute("""
                INSERT INTO sales_transactions (product_name, quantity, total_price)
                VALUES (%s, %s, %s)
            """, (product, quantity, total))

            conn.commit()

            return {
                "message": f"Sold {quantity} {product}",
                "type": "success"
            }

        if intent == "CHECK":

            cur.execute("""
                SELECT stock FROM products
                WHERE LOWER(name) LIKE %s
                LIMIT 1
            """, (f"%{product}%",))

            result = cur.fetchone()

            if not result:
                return {"message": "Product not found", "type": "error"}

            return {
                "message": f"{product} has {result[0]} in stock",
                "type": "success"
            }

        if intent == "RESTOCK":

            cur.execute("""
                UPDATE products
                SET stock = stock + %s
                WHERE LOWER(name) LIKE %s
            """, (quantity, f"%{product}%"))

            conn.commit()

            return {
                "message": f"Restocked {product} by {quantity}",
                "type": "success"
            }

        return {
            "message": "Command not recognized",
            "type": "error"
        }

    finally:
        cur.close()
        conn.close()