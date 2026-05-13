from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from db import get_connection
import os

# -------------------------
# FIXED FRONTEND PATH (RAILWAY SAFE)
# -------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)   # 👈 IMPORTANT FIX
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "C:\\Users\\Admin\\Downloads\\VocaStore\\frontend")

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")
CORS(app)

# -------------------------
# FRONTEND ROUTES
# -------------------------
@app.route("/")
def serve_frontend():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/<path:path>")
def serve_static(path):
    file_path = os.path.join(app.static_folder, path)

    if os.path.exists(file_path):
        return send_from_directory(app.static_folder, path)

    return "Not Found", 404


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


# -------------------------
# RUN
# -------------------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)