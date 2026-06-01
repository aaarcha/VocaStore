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
    # exclude id column, clean up column names
    cur.execute("""
        SELECT
            st.id                          AS "Sale ID",
            p.name                         AS "Product",
            st.quantity                    AS "Quantity",
            st.total_price                 AS "Total Price (PHP)",
            TO_CHAR(st.date, 'YYYY-MM-DD HH24:MI') AS "Dat