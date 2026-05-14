from backend.services.ai_brain import parse_command
from backend.services.sales_service import handle_sale
from backend.services.inventory_service import handle_restock
from backend.services.vector_store import save_command


def handle_command(command: str, get_connection):

    parsed = parse_command(command)

    intent = parsed.get("intent")
    product = parsed.get("product")
    quantity = parsed.get("quantity") or 1

    if not product:
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

    # -----------------------------
    # SAVE TO PGVECTOR MEMORY ONLY AFTER SUCCESS
    # -----------------------------
    if result and result.get("type") == "success":
        save_command(get_connection, command, intent, product)

    return result