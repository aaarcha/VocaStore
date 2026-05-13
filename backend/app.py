from flask import Flask, request, jsonify
from flask_cors import CORS

from backend.db import get_connection
from backend.services.ai_brain import parse_command
from backend.services.embedding_service import create_embedding

app = Flask(__name__)
CORS(app)


# Products
@app.route("/products", methods=["GET"])
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
                "stock": int(r[3])
            }
            for r in rows
        ]
    })


# Add product
@app.route("/add-product", methods=["POST"])
def add_product():

    data = request.json or {}

    name = data.get("name", "").strip().lower()
    price = float(data.get("price") or 0)
    stock = int(data.get("stock") or 0)

    embedding = create_embedding(name)

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO products
        (name, price, stock, embedding)

        VALUES (%s, %s, %s, %s)

        ON CONFLICT (name)
        DO UPDATE SET
            price = EXCLUDED.price,
            stock = products.stock + EXCLUDED.stock,
            embedding = EXCLUDED.embedding
    """, (
        name,
        price,
        stock,
        embedding
    ))

    conn.commit()

    cur.close()
    conn.close()

    return jsonify({
        "success": True,
        "message": f"{name} saved"
    })


# Update product
@app.route("/update-product", methods=["POST"])
def update_product():

    data = request.json or {}

    product_id = data.get("id")
    name = data.get("name", "").strip().lower()
    price = float(data.get("price") or 0)
    stock = int(data.get("stock") or 0)

    embedding = create_embedding(name)

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        UPDATE products
        SET
            name=%s,
            price=%s,
            stock=%s,
            embedding=%s
        WHERE id=%s
    """, (
        name,
        price,
        stock,
        embedding,
        product_id
    ))

    conn.commit()

    cur.close()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Product updated"
    })


# Delete product
@app.route("/delete-product", methods=["POST"])
def delete_product():

    data = request.json or {}
    product_id = data.get("id")

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        DELETE FROM products
        WHERE id=%s
    """, (product_id,))

    conn.commit()

    cur.close()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Product deleted"
    })


# Voice command system
@app.route("/process-command", methods=["POST"])
def process():

    data = request.json or {}
    command = data.get("command", "").strip().lower()

    parsed = parse_command(command)

    intent = parsed["intent"]
    product = parsed["product"]
    quantity = parsed["quantity"] or 1

    if not product:
        return jsonify({
            "success": False,
            "message": "Unknown product"
        })

    product = product.lower().strip()

    conn = get_connection()
    cur = conn.cursor()

    # SALE
    if intent == "SALE":

        cur.execute("""
            SELECT id, price, stock, name
            FROM products
            WHERE LOWER(name) LIKE %s
            LIMIT 1
        """, (f"%{product}%",))

        item = cur.fetchone()

        if not item:
            return jsonify({
                "success": False,
                "message": "Product not found"
            })

        pid, price, stock, name = item

        if stock < quantity:
            return jsonify({
                "success": False,
                "message": "Not enough stock"
            })

        new_stock = stock - quantity
        total = price * quantity

        cur.execute("""
            UPDATE products
            SET stock=%s
            WHERE id=%s
        """, (new_stock, pid))

        cur.execute("""
            INSERT INTO sales_transactions
            (product_name, quantity, total_price)

            VALUES (%s, %s, %s)
        """, (
            name,
            quantity,
            total
        ))

        conn.commit()

        cur.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": f"Sold {quantity} {name}"
        })

    # CHECK
    if intent == "CHECK":

        cur.execute("""
            SELECT name, stock
            FROM products
            WHERE LOWER(name) LIKE %s
            LIMIT 1
        """, (f"%{product}%",))

        result = cur.fetchone()

        cur.close()
        conn.close()

        if not result:
            return jsonify({
                "success": False,
                "message": "Product not found"
            })

        return jsonify({
            "success": True,
            "message": f"{result[0]} has {result[1]} stock"
        })

    # RESTOCK
    if intent == "RESTOCK":

        cur.execute("""
            SELECT id, name
            FROM products
            WHERE LOWER(name) LIKE %s
            LIMIT 1
        """, (f"%{product}%",))

        exists = cur.fetchone()

        if exists:

            pid, real_name = exists

            cur.execute("""
                UPDATE products
                SET stock = stock + %s
                WHERE id=%s
            """, (
                quantity,
                pid
            ))

            final_name = real_name

        else:

            embedding = create_embedding(product)

            cur.execute("""
                INSERT INTO products
                (name, price, stock, embedding)

                VALUES (%s, %s, %s, %s)
            """, (
                product,
                0,
                quantity,
                embedding
            ))

            final_name = product

        conn.commit()

        cur.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": f"Restocked {final_name}"
        })

    cur.close()
    conn.close()

    return jsonify({
        "success": False,
        "message": "Command not recognized"
    })


# Sales list
@app.route("/sales", methods=["GET"])
def sales():

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT
            product_name,
            quantity,
            total_price,
            created_at

        FROM sales_transactions
        ORDER BY created_at DESC
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


# Dashboard summary
@app.route("/summary", methods=["GET"])
def summary():

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT COALESCE(SUM(total_price), 0)
        FROM sales_transactions
    """)

    total_sales = cur.fetchone()[0]

    cur.execute("""
        SELECT COUNT(*)
        FROM sales_transactions
    """)

    transactions = cur.fetchone()[0]

    cur.execute("""
        SELECT
            product_name,
            SUM(quantity) as total_qty

        FROM sales_transactions

        GROUP BY product_name
        ORDER BY total_qty DESC
        LIMIT 1
    """)

    top = cur.fetchone()
    top_product = top[0] if top else "None"

    cur.execute("""
        SELECT name, stock
        FROM products
        WHERE stock <= 10
    """)

    low = cur.fetchall()

    cur.close()
    conn.close()

    return jsonify({
        "success": True,
        "data": {
            "total_sales": float(total_sales),
            "transactions": transactions,
            "top_product": top_product,
            "low_stock": [
                {
                    "name": r[0],
                    "stock": r[1]
                }
                for r in low
            ]
        }
    })


if __name__ == "__main__":
    app.run(debug=True)
