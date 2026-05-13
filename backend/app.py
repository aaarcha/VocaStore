from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from db import get_connection
import os

# -------------------------
# ABSOLUTE FRONTEND PATH (RAILWAY SAFE)
# -------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "../frontend")

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")
CORS(app)


# -------------------------
# SERVE FRONTEND (INDEX)
# -------------------------
@app.route("/")
def serve_frontend():
    return app.send_static_file("index.html")


# serve CSS / JS / assets
@app.route("/<path:path>")
def serve_static(path):
    return app.send_static_file(path)


# -------------------------
# PRODUCTS
# -------------------------
@app.route("/products", methods=["GET"])
def get_products():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, name, price, stock
        FROM products
        ORDER BY id
    """)

    rows = cur.fetchall()
    cur.close()
    conn.close()

    return {
        "success": True,
        "data": [
            {
                "id": r[0],
                "name": r[1],
                "price": float(r[2]),
                "stock": r[3]
            } for r in rows
        ]
    }


# -------------------------
# SEARCH
# -------------------------
@app.route("/search", methods=["GET"])
def search_products():
    query = request.args.get("q", "").lower()

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, name, price, stock
        FROM products
        WHERE LOWER(name) LIKE %s
        ORDER BY id
    """, (f"%{query}%",))

    rows = cur.fetchall()
    cur.close()
    conn.close()

    return {
        "success": True,
        "data": [
            {
                "id": r[0],
                "name": r[1],
                "price": float(r[2]),
                "stock": r[3]
            } for r in rows
        ]
    }


# -------------------------
# RUN (RAILWAY)
# -------------------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)