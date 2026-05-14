from backend.services.ai_brain import parse_command
from backend.services.inventory_service import handle_restock, handle_check

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

    if intent == "SALE":
        conn = get_connection()
        cur = conn.cursor()

        try:
            cur.execute("""
                SELECT stock, price FROM products
                WHERE LOWER(name) LIKE %s
            """, (f"%{product}%",))

            item = cur.fetchone()

            if not item:
                return {"message": "Product not found", "type": "error"}

            stock, price = item

            if stock < quantity:
                return {"message": "Not enough stock", "type": "error"}

            new_stock = stock - quantity

            cur.execute("""
                UPDATE products
                SET stock=%s
                WHERE LOWER(name) LIKE %s
            """, (new_stock, f"%{product}%"))

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

        finally:
            cur.close()
            conn.close()

    if intent == "CHECK":
        return handle_check(get_connection, parsed)

    if intent == "RESTOCK":
        return handle_restock(get_connection, parsed)

    return {
        "message": "Command not recognized",
        "type": "error"
    }