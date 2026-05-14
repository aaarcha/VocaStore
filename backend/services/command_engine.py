from backend.services.ai_brain import parse_command
from backend.services.sales_service import handle_sale
from backend.services.inventory_service import handle_restock
from backend.services.vector_store import save_command_embedding

def handle_command(command: str, get_connection):
    save_command_embedding(get_connection, command)
    parsed = parse_command(command)

    intent = parsed.get("intent")
    product = parsed.get("product")
    quantity = parsed.get("quantity") or 1

    if not product:
        return {"message": "Hindi ko maintindihan ang product", "type": "error"}

    if intent == "SALE":
        return handle_sale(get_connection, parsed)

    if intent == "RESTOCK":
        return handle_restock(get_connection, parsed)

    if intent == "CHECK":
        conn = get_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT stock FROM products
            WHERE LOWER(name)=LOWER(%s)
        """, (product.lower(),))

        result = cur.fetchone()
        conn.close()

        if not result:
            return {"message": "Product not found", "type": "error"}

        return {
            "message": f"{product} has {result[0]} stock",
            "type": "success"
        }

    return {"message": "Command not recognized", "type": "error"}