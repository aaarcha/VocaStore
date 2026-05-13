from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from db import get_connection
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 🔥 IMPORTANT: adjust this depending on structure
FRONTEND_DIR = os.path.join(BASE_DIR, "..", "frontend")

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

    # fallback (IMPORTANT for frontend routing)
    return send_from_directory(app.static_folder, "index.html")


# -------------------------
# PRODUCTS
# -------------------------
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


# -------------------------
# SEARCH
# -------------------------
@app.route("/search")
def search():
    q = request.args.get("q", "")

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, name, price, stock
        FROM products
        WHERE LOWER(name) LIKE %s
        ORDER BY id
    """, (f"%{q.lower()}%",))

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


# -------------------------
# PLACEHOLDERS
# -------------------------
@app.route("/update-product", methods=["POST"])
def update_product():
    return jsonify({"message": "Update API not implemented yet"})


@app.route("/delete-product", methods=["POST"])
def delete_product():
    return jsonify({"message": "Delete API not implemented yet"})


@app.route("/sales")
def sales():
    return jsonify({"data": []})


@app.route("/summary")
def summary():
    return jsonify({
        "data": {
            "total_sales": 0,
            "transactions": 0,
            "top_product": "None",
            "low_stock": []
        }
    })


@app.route("/process-command", methods=["POST"])
def process_command():
    data = request.get_json()
    return jsonify({"message": f"Command received: {data.get('command', '')}"})


# -------------------------
# RUN (LOCAL ONLY)
# -------------------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)