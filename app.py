from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from db import get_connection
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
    cur.close()
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
    cur.close()
    conn.close()
    return jsonify({
        "success": True,
        "data": [
            {"id": r[0], "name": r[1], "price": float(r[2]), "stock": r[3]}
            for r in rows
        ]
    })

@app.route("/products", methods=["POST"])
def add_product():
    data = request.json
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO products (name, price, stock)
        VALUES (%s, %s, %s)
        RETURNING id
    """, (data["name"], data["price"], data["stock"]))
    new_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"success": True, "id": new_id})

@app.route("/update-product", methods=["POST"])
def update_product_route():
    data = request.json
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        UPDATE products
        SET name=%s, price=%s, stock=%s
        WHERE id=%s
    """, (data["name"], data["price"], data["stock"], data["id"]))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"success": True, "message": "Updated successfully"})

@app.route("/delete-product", methods=["POST"])
def delete_product_route():
    data = request.json
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM products WHERE id=%s", (data["id"],))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"success": True, "message": "Deleted successfully"})

@app.route("/process-command", methods=["POST"])
def process_command():
    data = request.json
    command = data.get("command", "").lower()
    conn = get_connection()
    cur = conn.cursor()
    message = "Command not recognized"

    if "benta" in command or "sell" in command:
        parts = command.split()
        try:
            qty = int(parts[1])
            name = parts[2]
            cur.execute("""
                UPDATE products
                SET stock = stock - %s
                WHERE LOWER(name) = %s
            """, (qty, name))
            conn.commit()
            message = f"Sold {qty} {name}"
        except:
            message = "Usage: benta 5 coke"

    elif "add" in command:
        parts = command.split()
        try:
            name = parts[1]
            price = float(parts[2])
            stock = int(parts[3])
            cur.execute("""
                INSERT INTO products (name, price, stock)
                VALUES (%s, %s, %s)
            """, (name, price, stock))
            conn.commit()
            message = f"Added {name}"
        except:
            message = "Usage: add name price stock"

    elif "delete" in command:
        try:
            product_id = int(parts[1])
            cur.execute("DELETE FROM products WHERE id=%s", (product_id,))
            conn.commit()
            message = "Product deleted"
        except:
            message = "Usage: delete id"

    elif "show" in command or "ilan" in command:
        cur.execute("SELECT COUNT(*) FROM products")
        count = cur.fetchone()[0]
        message = f"You have {count} products"

    cur.close()
    conn.close()
    return jsonify({"message": message})

app = app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)