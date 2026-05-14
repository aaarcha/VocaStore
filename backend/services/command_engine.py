from backend.services.ai_brain import parse_command
from backend.services.sales_service import handle_sale
from backend.services.inventory_service import handle_restock
from backend.services.vector_store import save_command, find_similar


def handle_command(command: str, get_connection):

    parsed = parse_command(command)

    intent = parsed.get("intent")
    product = parsed.get("product")
    quantity = parsed.get("quantity") or 1

    analytics_triggers = [
        "top", "pinakamabenta", "best", "most sold",
        "low stock", "kulang", "ubos",
        "trend", "sales trend", "benta trend",
        "ano", "what", "summary", "report"
    ]

    lower_cmd = command.lower()

    if any(word in lower_cmd for word in analytics_triggers):

        conn = get_connection()
        cur = conn.cursor()

        if "low stock" in lower_cmd or "kulang" in lower_cmd or "ubos" in lower_cmd:

            cur.execute("""
                SELECT name, stock
                FROM products
                ORDER BY stock ASC
                LIMIT 5
            """)

            rows = cur.fetchall()
            conn.close()

            return {
                "type": "analytics",
                "message": "Low stock products",
                "data": [
                    {"name": r[0], "stock": r[1]} for r in rows
                ]
            }

        if "top" in lower_cmd or "pinakamabenta" in lower_cmd or "best" in lower_cmd:

            cur.execute("""
                SELECT product_name, SUM(quantity) as total_sold
                FROM sales_transactions
                GROUP BY product_name
                ORDER BY total_sold DESC
                LIMIT 5
            """)

            rows = cur.fetchall()
            conn.close()

            return {
                "type": "analytics",
                "message": "Top selling products",
                "data": [
                    {"product": r[0], "sold": int(r[1])} for r in rows
                ]
            }

        if "trend" in lower_cmd:

            cur.execute("""
                SELECT DATE(created_at), SUM(total_price)
                FROM sales_transactions
                GROUP BY DATE(created_at)
                ORDER BY DATE(created_at)
            """)

            rows = cur.fetchall()
            conn.close()

            return {
                "type": "analytics",
                "message": "Sales trend",
                "data": [
                    {"date": str(r[0]), "sales": float(r[1])} for r in rows
                ]
            }

        conn.close()

        return {
            "type": "analytics",
            "message": "Analytics query not understood",
            "data": []
        }

    similar = find_similar(get_connection, command)

    if similar:

        best_match = similar[0]

        _, mem_intent, mem_product = best_match

        if not intent:
            intent = mem_intent

        if not product:
            product = mem_product

    if not product and intent in ["SALE", "RESTOCK", "CHECK"]:
        return {
            "message": "Hindi ko maintindihan ang product",
            "type": "error"
        }

    result = None

    if intent == "SALE":
        result = handle_sale(get_connection, parsed)

    elif intent == "RESTOCK":
        result = handle_restock(get_connection, parsed)

    elif intent == "CHECK":

        conn = get_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT stock FROM products
            WHERE LOWER(name)=LOWER(%s)
        """, (product.lower(),))

        row = cur.fetchone()
        conn.close()

        if not row:
            return {"message": "Product not found", "type": "error"}

        result = {
            "message": f"{product} has {row[0]} stock",
            "type": "success"
        }

    else:
        return {"message": "Command not recognized", "type": "error"}

    if result and result.get("type") == "success":
        save_command(get_connection, command, intent, product)

    return result