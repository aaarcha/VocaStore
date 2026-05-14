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

    result = []

    total_sales = 0
    total_transactions = 0
    top_product = "None"

    highest = 0

    for name, qty, total in rows:

        total_sales += float(total)
        total_transactions += qty

        if qty > highest:
            highest = qty
            top_product = name

    cur.execute("""
        SELECT name, stock
        FROM products
        WHERE stock <= 5
        ORDER BY stock ASC
    """)

    low_stock_rows = cur.fetchall()

    low_stock = [
        {
            "name": r[0],
            "stock": r[1]
        }
        for r in low_stock_rows
    ]

    cur.close()
    conn.close()

    return {
        "total_sales": total_sales,
        "transactions": total_transactions,
        "top_product": top_product,
        "low_stock": low_stock
    }