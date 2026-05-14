def get_summary(db):
    conn = db()
    cur = conn.cursor()

    cur.execute("""
        SELECT product_name,
               SUM(quantity),
               SUM(total_price)
        FROM sales_transactions
        GROUP BY product_name
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
            "total_sold": qty,
            "total_sales": float(total),
            "insight": insight
        })

    return result