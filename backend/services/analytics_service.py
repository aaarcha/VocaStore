from collections import defaultdict

def get_summary(db):
    conn = db()
    cur = conn.cursor()

    cur.execute("""
        SELECT p.name,
               COALESCE(SUM(s.quantity), 0),
               COALESCE(SUM(s.total_price), 0)
        FROM sales_transactions s
        JOIN products p ON p.id = s.product_id
        GROUP BY p.name
    """)

    rows = cur.fetchall()
    conn.close()

    result = []

    for name, qty, total in rows:

        if qty >= 10:
            insight = "🔥 Malakas ang benta"
        elif qty <= 3:
            insight = "⚠️ Mahina ang benta"
        else:
            insight = "📊 Normal"

        result.append({
            "product": name,
            "total_sold": int(qty),
            "total_sales": float(total),
            "insight": insight
        })

    return result


def get_top_product(db):
    data = get_summary(db)
    if not data:
        return None
    return max(data, key=lambda x: x["total_sold"])


def get_low_stock(db):
    conn = db()
    cur = conn.cursor()

    cur.execute("""
        SELECT name, stock
        FROM products
        WHERE stock <= 5
        ORDER BY stock ASC
    """)

    rows = cur.fetchall()
    conn.close()

    return [{"name": r[0], "stock": r[1]} for r in rows]


def get_total_sales(db):
    conn = db()
    cur = conn.cursor()

    cur.execute("""
        SELECT COALESCE(SUM(total_price), 0)
        FROM sales_transactions
    """)

    total = cur.fetchone()[0]
    conn.close()

    return float(total)


def get_sales_trend(db):
    conn = db()
    cur = conn.cursor()

    cur.execute("""
        SELECT DATE(created_at),
               SUM(total_price)
        FROM sales_transactions
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at)
    """)

    rows = cur.fetchall()
    conn.close()

    return [{"date": r[0].isoformat(), "sales": float(r[1])} for r in rows]