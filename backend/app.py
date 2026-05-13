from flask import Flask, jsonify, request
from flask_cors import CORS
from db import get_connection

app = Flask(__name__)
CORS(app)


@app.route("/")
def home():
    return "VocaStore Railway Working"


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


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(__import__("os").getenv("PORT", 5000)))