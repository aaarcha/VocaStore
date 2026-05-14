def get_summary(db):

    conn = db()
    cur = conn.cursor()

    cur.execute("""
        SELECT p.name,
               SUM(s.quantity),
               SUM(s.total_price)
        FROM sales_transactions s
        JOIN products p ON p.id = s.product_id
        GROUP BY p.name
    """)

    rows = cur.fetchall()
    conn.close()

    result = []

    for name, qty, total in rows:

        qty = qty or 0
        total = total or 0

        if qty >= 10:
            insight = "🔥 Malakas ang benta"
        elif qty <= 3:
            insight = "⚠️ Mahina ang benta"
        else:
            insight = "📊 Normal"

        result.append({
            "product": name,
            "total_sold": qty,
            "total_sales": float(total),
            "insight": insight
        })

    return result