from flask import Flask, jsonify, request, render_template, make_response, session
from flask_cors import CORS
from db import get_connection
from werkzeug.utils import secure_filename
from backend.services.command_engine import handle_command
from backend.services.analytics_service import get_summary
from backend.services.settings_service import (
    get_all_settings, update_many_settings,
    clear_sales, reset_stock,
    export_sales_csv, export_products_csv,
    backup_data
)
import os
import json
import traceback

app = Flask(
    __name__,
    static_folder="static",
    template_folder="templates"
)

app.secret_key = "vocastore-secret-key"

CORS(app)

# ── Global error handler ──────────────────────────────────────────────────────
@app.errorhandler(Exception)
def handle_error(e):
    traceback.print_exc()
    return jsonify({"success": False, "message": "Internal server error"}), 500

# ── Favicon (suppress 404/500 errors) ────────────────────────────────────────
@app.route("/favicon.ico")
def favicon():
    return "", 204

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
                {"product": r[0], "quantity": r[1], "total": float(r[2]), "date": r[3].isoformat() if r[3] else None}
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

# ── Settings API ──────────────────────────────────────────────────────────────
@app.route("/api/settings", methods=["GET"])
def api_get_settings():
    conn = get_connection()
    try:
        return jsonify({"success": True, "data": get_all_settings(conn)})
    finally:
        conn.close()

@app.route("/api/settings", methods=["POST"])
def api_update_settings():
    conn = get_connection()
    try:
        data = request.json
        if not data:
            return jsonify({"success": False, "message": "No data received"}), 400
        allowed = {
            "store_name", "owner_name", "contact_number", "address",
            "low_stock_threshold", "theme"
        }
        filtered = {k: v for k, v in data.items() if k in allowed}
        update_many_settings(conn, filtered)
        return jsonify({"success": True, "message": "Settings saved"})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()

@app.route("/api/settings/clear-sales", methods=["POST"])
def api_clear_sales():
    conn = get_connection()
    try:
        clear_sales(conn)
        return jsonify({"success": True, "message": "Sales history cleared"})
    finally:
        conn.close()

@app.route("/api/settings/reset-stock", methods=["POST"])
def api_reset_stock():
    conn = get_connection()
    try:
        reset_stock(conn)
        return jsonify({"success": True, "message": "All stock reset to 0"})
    finally:
        conn.close()

# ── Export & Backup API ───────────────────────────────────────────────────────
@app.route("/api/export/sales")
def api_export_sales():
    conn = get_connection()
    try:
        csv_data = export_sales_csv(conn)
        response = make_response(csv_data)
        response.headers["Content-Disposition"] = "attachment; filename=sales.csv"
        response.headers["Content-Type"] = "text/csv"
        return response
    finally:
        conn.close()

@app.route("/api/export/products")
def api_export_products():
    conn = get_connection()
    try:
        csv_data = export_products_csv(conn)
        response = make_response(csv_data)
        response.headers["Content-Disposition"] = "attachment; filename=products.csv"
        response.headers["Content-Type"] = "text/csv"
        return response
    finally:
        conn.close()

@app.route("/api/backup")
def api_backup():
    conn = get_connection()
    try:
        data     = backup_data(conn)
        response = make_response(json.dumps(data, indent=2, default=str))
        response.headers["Content-Disposition"] = "attachment; filename=vocastore_backup.json"
        response.headers["Content-Type"] = "application/json"
        return response
    finally:
        conn.close()

@app.route("/api/login", methods=["POST"])
def login():

    data = request.json

    email = data.get("email")
    password = data.get("password")

    conn = get_connection()

    try:
        cur = conn.cursor()

        cur.execute(
            """
            SELECT id,email
            FROM users
            WHERE email=%s
            AND password=%s
            """,
            (email,password)
        )

        user = cur.fetchone()

        if not user:
            return jsonify({
                "success": False,
                "message": "Invalid credentials"
            })

        session["user"] = email

        return jsonify({
            "success": True,
            "email": email
        })

    finally:
        conn.close()

# ── Settings Page ─────────────────────────────────────────────────────────────
@app.route("/settings")
def settings_page():
    return render_template("settings.html")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)

@app.route("/api/logout", methods=["POST"])
def logout():

    session.clear()

    return jsonify({
        "success": True
    })