from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from db import get_connection
import os

app = Flask(__name__, static_folder="../frontend", static_url_path="")
CORS(app)

# -------------------------
# FRONTEND ROUTE
# -------------------------
@app.route("/")
def serve_frontend():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/<path:path>")
def serve_static(path):
    return send_from_directory(app.static_folder, path)


# -------------------------
# API ROUTES
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
# RUN (Railway compatible)
# -------------------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)