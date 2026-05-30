from backend.services.ai_brain import parse_command
from backend.services.sales_service import handle_sale
from backend.services.inventory_service import handle_restock
from backend.services.vector_store import save_command, find_similar


def handle_command(command: str, get_connection):

    lower_cmd = command.lower().strip()

    # ── KEYWORD BANKS ─────────────────────────────────────────────────────
    top_keywords = [
        "top sales", "top selling", "top product", "top sale",
        "pinakamabenta", "best selling", "best seller", "most sold",
        "ano pinakamabenta", "pinaka mabenta"
    ]
    low_stock_keywords = [
        "low stock", "kulang", "ubos", "kulang stock", "ubos stock",
        "mababa", "mababa stock", "anong kulang", "alin mababa",
        "ano kulang", "stock kulang"
    ]
    trend_keywords = [
        "sales trend", "sales report", "benta trend", "benta ngayon",
        "how much today", "magkano ngayon", "buod ngayong", "sales summary"
    ]
    analytics_keywords = [
        "analytics", "summary", "report",
        "kita", "revenue", "total sales", "total sale",
        "gaano", "kabuuan", "buod", "sales summary month"
    ]
    checkout_keywords = [
        "checkout", "bayad", "bayaran", "i-checkout", "i checkout",
        "processing checkout", "check out"
    ]

    def matches_any(keywords):
        return any(k in lower_cmd for k in keywords)

    is_checkout  = matches_any(checkout_keywords)
    is_low_stock = matches_any(low_stock_keywords)
    is_top       = matches_any(top_keywords)
    is_trend     = matches_any(trend_keywords)
    is_analytics = matches_any(analytics_keywords)

    # ── CHECKOUT ──────────────────────────────────────────────────────────
    if is_checkout:
        return {"type": "checkout", "message": "Processing checkout..."}

    # ── ANALYTICS SHORTCUTS ───────────────────────────────────────────────
    if is_low_stock or is_top or is_trend or is_analytics:
        conn = get_connection()
        cur  = conn.cursor()
        try:
            if is_low_stock:
                cur.execute("""
                    SELECT name, stock FROM products
                    WHERE stock <= 10
                    ORDER BY stock ASC LIMIT 10
                """)
                rows = cur.fetchall()
                return {
                    "type": "analytics", "subtype": "low_stock",
                    "message": "Low stock products",
                    "data": [{"name": r[0], "stock": r[1]} for r in rows]
                }

            if is_top:
                cur.execute("""
                    SELECT product_name, SUM(quantity) as total_sold, SUM(total_price) as revenue
                    FROM sales_transactions
                    GROUP BY product_name
                    ORDER BY total_sold DESC LIMIT 5
                """)
                rows = cur.fetchall()
                return {
                    "type": "analytics", "subtype": "top_products",
                    "message": "Top selling products",
                    "data": [{"product": r[0], "sold": int(r[1]), "revenue": float(r[2])} for r in rows]
                }

            if is_trend:
                cur.execute("""
                    SELECT DATE(created_at), SUM(total_price), COUNT(*)
                    FROM sales_transactions
                    GROUP BY DATE(created_at)
                    ORDER BY DATE(created_at) DESC LIMIT 7
                """)
                rows = cur.fetchall()
                return {
                    "type": "analytics", "subtype": "trend",
                    "message": "Sales trend",
                    "data": [{"date": str(r[0]), "sales": float(r[1]), "count": int(r[2])} for r in rows]
                }

            if is_analytics:
                cur.execute("SELECT COALESCE(SUM(total_price),0), COUNT(*) FROM sales_transactions")
                total_sales, tx_count = cur.fetchone()

                cur.execute("""
                    SELECT product_name, SUM(quantity) as total_sold
                    FROM sales_transactions
                    GROUP BY product_name ORDER BY total_sold DESC LIMIT 1
                """)
                top = cur.fetchone()

                cur.execute("""
                    SELECT COALESCE(SUM(total_price), 0), COUNT(*)
                    FROM sales_transactions
                    WHERE DATE(created_at) = CURRENT_DATE
                """)
                today_total, today_count = cur.fetchone()

                return {
                    "type": "analytics", "subtype": "summary",
                    "message": "Store analytics",
                    "data": {
                        "total_sales":  float(total_sales or 0),
                        "transactions": int(tx_count or 0),
                        "top_product":  top[0] if top else "None",
                        "today_total":  float(today_total or 0),
                        "today_count":  int(today_count or 0)
                    }
                }

            return {"type": "analytics", "message": "Analytics query not understood", "data": []}

        finally:
            # FIX: always close cursor and connection in analytics branch
            cur.close()
            conn.close()

    # ── AI ACTION COMMANDS ────────────────────────────────────────────────
    parsed  = parse_command(command)
    intent  = parsed.get("intent")
    product = parsed.get("product")

    similar = find_similar(get_connection, command)
    if similar:
        _, mem_intent, mem_product = similar[0]
        if not intent:  intent  = mem_intent
        if not product: product = mem_product

    if not product and intent in ["SALE", "RESTOCK", "CHECK"]:
        return {"message": "I didn't catch the product name. Please try again.", "type": "error"}

    result = None

    if intent == "SALE":
        result = handle_sale(get_connection, parsed)

    elif intent == "RESTOCK":
        if parsed.get("product"):
            parsed["product"] = parsed["product"].title()
        result = handle_restock(get_connection, parsed)

    elif intent == "CHECK":
        conn = get_connection()
        cur  = conn.cursor()
        try:
            cur.execute(
                "SELECT name, stock FROM products WHERE LOWER(name)=LOWER(%s)",
                (product,)
            )
            row = cur.fetchone()

            if not row:
                cur.execute(
                    "SELECT name, stock FROM products WHERE LOWER(name) LIKE LOWER(%s) LIMIT 1",
                    (f"%{product}%",)
                )
                row = cur.fetchone()
        finally:
            cur.close(); conn.close()

        if not row:
            return {"message": f"Product '{product}' not found. Check the exact name in Inventory.", "type": "error"}
        result = {"message": f"{row[0]} has {row[1]} in stock.", "type": "success"}

    else:
        return {
            "message": "Command not recognized. Try: 'benta 2 Coke' or 'check stock Nova'",
            "type": "error"
        }

    if result and result.get("type") == "success":
        save_command(get_connection, command, intent, product)

    return result