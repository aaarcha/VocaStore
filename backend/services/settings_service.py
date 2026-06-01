import csv
import io
import json
from datetime import datetime


def get_all_settings(conn):
    cur = conn.cursor()
    cur.execute("SELECT key, value FROM settings")
    rows = cur.fetchall()
    cur.close()
    return {row[0]: row[1] for row in rows}


def update_setting(conn, key, value):
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO settings (key, value) VALUES (%s, %s) "
        "ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value",
        (key, str(value))
    )
    conn.commit()
    cur.close()


def update_many_settings(conn, settings_dict):
    for key, value in settings_dict.items():
        update_setting(conn, key, value)


def clear_sales(conn):
    cur = conn.cursor()
    cur.execute("DELETE FROM sales_transactions")
    conn.commit()
    cur.close()


def reset_stock(conn):
    cur = conn.cursor()
    cur.execute("UPDATE products SET stock=0")
    conn.commit()
    cur.close()


def export_sales_csv(conn):
    cur = conn.cursor()
    cur.execute("SELECT * FROM sales_transactions ORDER BY id DESC")
    rows = cur.fetchall()
    cols = [desc[0] for desc in cur.description]
    cur.close()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(cols)
    for row in rows:
        writer.writerow([str(v) for v in row])
    return output.getvalue()


def export_products_csv(conn):
    cur = conn.cursor()
    cur.execute("SELECT * FROM products ORDER BY id")
    rows = cur.fetchall()
    cols = [desc[0] for desc in cur.description]
    cur.close()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(cols)
    for row in rows:
        writer.writerow([str(v) for v in row])
    return output.getvalue()


def backup_data(conn):
    cur = conn.cursor()
    cur.execute("SELECT * FROM products ORDER BY id")
    products = [dict(zip([d[0] for d in cur.description], row)) for row in cur.fetchall()]
    cur.execute("SELECT * FROM sales_transactions ORDER BY id DESC")
    sales = [dict(zip([d[0] for d in cur.description], row)) for row in cur.fetchall()]
    cur.execute("SELECT key, value FROM settings")
    settings = {row[0]: row[1] for row in cur.fetchall()}
    cur.close()
    return {
        "exported_at": datetime.now().isoformat(),
        "products": products,
        "sales_transactions": sales,
        "settings": settings
    }