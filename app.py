from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from db import get_connection
from backend.services.command_engine import handle_command
from backend.services.analytics_service import get_summary
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")
CORS(app)

@app.route("/")
def serve_frontend():
    return send_from_directory(app.static_folder, "index.html")

@app.route("/<path:path>")
def serve_static(path):
    file_path = os.path.join(app.static_folder, path)
    if os.path.exists(file_path):
        return send_from_directory(app.static_folder, path)
    return "Not Found", 404

@app.route("/products")
def products():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT id, name, price, stock FROM products ORDER BY id")
    rows = cur.fetchall()

    conn.close()

    return jsonify({
        "success": True,
        "data": [
            {"id": r[0], "name": r[1], "price": float(r[2]), "stock": r[3]}
            for r in rows
        ]
    })

@app.route("/search")
def search():
    q = request.args.get("q", "").lower()

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, name, price, stock
        FROM products
        WHERE LOWER(name) LIKE %s
        ORDER BY id
    """, (f"%{q}%",))

    rows = cur.fetchall()
    conn.close()

    return jsonify({
        "success": True,
        "data": [
            {"id": r[0], "name": r[1], "price": float(r[2]), "stock": r[3]}
            for r in rows
        ]
    })

@app.route("/update-product", methods=["POST"])
def update_product():
    data = request.json

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        UPDATE products
        SET name=%s, price=%s, stock=%s
        WHERE id=%s
    """, (data["name"], data["price"], data["stock"], data["id"]))

    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "Updated successfully"})

@app.route("/delete-product", methods=["POST"])
def delete_product():
    data = request.json

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("DELETE FROM products WHERE id=%s", (data["id"],))

    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "Deleted successfully"})

@app.route("/process-command", methods=["POST"])
def process_command():
    data = request.json
    command = data.get("command", "")

    result = handle_command(command, get_connection)
    return jsonify(result)

@app.route("/sales")
def sales():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT product_name, quantity, total_price, created_at
        FROM sales_transactions
        ORDER BY id DESC
    """)

    rows = cur.fetchall()

    cur.close()
    conn.close()

    return jsonify({
        "success": True,
        "data": [
            {
                "product": r[0],
                "quantity": r[1],
                "total": float(r[2]),
                "date": str(r[3])
            }
            for r in rows
        ]
    })

@app.route("/summary")
def summary():
    result = get_summary(get_connection)

    total_sales = sum(item["total_sales"] for item in result)
    transactions = sum(item["total_sold"] for item in result)

    top_product = max(result, key=lambda x: x["total_sold"])["product"] if result else "None"

    low_stock = []

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT name, stock FROM products WHERE stock <= 5")
    low_stock = [{"name": r[0], "stock": r[1]} for r in cur.fetchall()]
    conn.close()

    return jsonify({
        "data": {
            "total_sales": total_sales,
            "transactions": transactions,
            "top_product": top_product,
            "low_stock": low_stock
        }
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)