from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
from db import get_connection
from werkzeug.utils import secure_filename
from backend.services.command_engine import handle_command
from backend.services.analytics_service import get_summary
import os
import traceback

app = Flask(
    __name__,
    static_folder="static",
    template_folder="templates"
)
CORS(app)

# ── Global error handler ──────────────────────────────────────────────────────
@app.errorhandler(Exception)
def handle_error(e):
    traceback.print_exc()
    return jsonify({"success": False, "message": "Internal server error"}), 500

# ── Pages ─────────────────────────────────────────────────────────────────────
@app.route("/")
def home():
    return render_template("index.html")

@app.route("/dashboard")
def dashboard_page():
    return render_template("dashboard.html")

@app.route("/inventory")
def inventory_page():
    return render_template("inventory.html")

@app.route("/sales")
def sales_page():
    return render_template("sales.html")

@app.route("/summary")
def summary_page():
    return render_template("summary.html")

# ── Products ──────────────────────────────────────────────────────────────────
@app.route("/products")
def products():
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, name, price, stock, image FROM products ORDER BY id")
        rows = cur.fetchall()
        cur.close()
        return jsonify({
            "success": True,
            "data": [
                {"id": r[0], "name": r[1], "price": float(r[2]), "stock": r[3], "image": r[4]}
                for r in rows
            ]
        })
    finally:
        conn.close()

@app.route("/add-product", methods=["POST"])
def add_product():
    name  = request.form.get("name", "").strip()
    price = request.form.get("price", "")
    stock = request.form.get("stock", "")
    image = request.files.get("image")

    if not name:
        return jsonify({"success": False, "message": "Product name is required"}), 400
    try:
        price_val = float(price)
        stock_val = int(stock)
    except (ValueError, TypeError):
        return jsonify({"success": False, "message": "Invalid price or stock value"}), 400

    image_path = ""
    if image and image.filename:
        filename      = secure_filename(image.filename)
        upload_folder = os.path.join("static", "assets", "images")
        os.makedirs(upload_folder, exist_ok=True)
        save_path  = os.path.join(upload_folder, filename)
        image.save(save_path)
        image_path = f"/static/assets/images/{filename}"

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO products (name, price, stock, image) VALUES (%s, %s, %s, %s)",
            (name, price_val, stock_val, image_path)
        )
        conn.commit()
        cur.close()
        # FIX: return image path so edit-with-new-image flow can use it
        return jsonify({"success": True, "image": image_path})
    finally:
        conn.close()

@app.route("/search")
def search():
    q = request.args.get("q", "").lower()
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT id, name, price, stock, image FROM products WHERE LOWER(name) LIKE %s ORDER BY id",
            (f"%{q}%",)
        )
        rows = cur.fetchall()
        cur.close()
        return jsonify({
            "success": True,
            "data": [
                {"id": r[0], "name": r[1], "price": float(r[2]), "stock": r[3], "image": r[4]}
                for r in rows
            ]
        })
    finally:
        conn.close()

@app.route("/upload-image", methods=["POST"])
def upload_image():
    """Upload an image file and return its path. Does NOT touch the products table."""
    image = request.files.get("image")
    if not image or not image.filename:
        return jsonify({"success": False, "message": "No image provided"}), 400
    filename      = secure_filename(image.filename)
    upload_folder = os.path.join("static", "assets", "images")
    os.makedirs(upload_folder, exist_ok=True)
    image.save(os.path.join(upload_folder, filename))
    return jsonify({"success": True, "image": f"/static/assets/images/{filename}"})

@app.route("/update-product", methods=["POST"])
def update_product():
    data = request.json
    if not data or "id" not in data:
        return jsonify({"success": False, "message": "Missing product id"}), 400
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "UPDATE products SET name=%s, price=%s, stock=%s, image=%s WHERE id=%s",
            (data["name"], data["price"], data["stock"], data.get("image", ""), data["id"])
        )
        conn.commit()
        cur.close()
        return jsonify({"success": True, "message": "Updated successfully"})
    finally:
        conn.close()

@app.route("/delete-product", methods=["POST"])
def delete_product():
    data = request.json
    if not data or "id" not in data:
        return jsonify({"success": False, "message": "Missing product id"}), 400
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM products WHERE id=%s", (data["id"],))
        conn.commit()
        cur.close()
        return jsonify({"success": True, "message": "Deleted successfully"})
    finally:
        conn.close()

# ── Sales ─────────────────────────────────────────────────────────────────────
@app.route("/api/sales")
def api_sales():
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT product_name, quantity, total_price, created_at FROM sales_transactions ORDER BY id DESC"
        )
        rows = cur.fetchall()
        cur.close()
        return jsonify({
            "success": True,
            "data": [
                {"product": r[0], "quantity": r[1], "total": float(r[2]), "date": str(r[3])}
                for r in rows
            ]
        })
    finally:
        conn.close()

# ── Summary ───────────────────────────────────────────────────────────────────
@app.route("/api/summary")
def api_summary():
    conn = get_connection()
    try:
        cur = conn.cursor()

        cur.execute("SELECT COALESCE(SUM(total_price), 0), COUNT(*) FROM sales_transactions")
        total_sales, transactions = cur.fetchone()

        cur.execute("""
            SELECT product_name, SUM(quantity)
            FROM sales_transactions
            GROUP BY product_name
            ORDER BY SUM(quantity) DESC
            LIMIT 1
        """)
        top = cur.fetchone()

        cur.execute("SELECT name, stock FROM products WHERE stock <= 10 ORDER BY stock ASC")
        low_stock = cur.fetchall()

        cur.close()
        return jsonify({
            "data": {
                "total_sales":   float(total_sales or 0),
                "transactions":  int(transactions or 0),
                "top_product":   top[0] if top else None,
                "low_stock":     [{"name": r[0], "stock": r[1]} for r in low_stock]
            }
        })
    finally:
        conn.close()

# ── Commands ──────────────────────────────────────────────────────────────────
@app.route("/process-command", methods=["POST"])
def process_command():
    data    = request.json
    if not data:
        return jsonify({"type": "error", "message": "No data received"}), 400
    command = data.get("command", "").strip()
    if not command:
        return jsonify({"type": "error", "message": "Empty command"})
    result  = handle_command(command, get_connection)
    return jsonify(result)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)