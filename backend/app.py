from flask import Flask, jsonify
from flask_cors import CORS
from db import get_connection

app = Flask(__name__)
CORS(app)


@app.route("/")
def home():
    return "VocaStore Railway Working"


@app.route("/products")
def products():

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

    return jsonify({
        "success": True,
        "data": [
            {
                "id": r[0],
                "name": r[1],
                "price": float(r[2]),
                "stock": r[3]
            }
            for r in rows
        ]
    })