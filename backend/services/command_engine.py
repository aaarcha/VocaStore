from services.ai_brain import parse_command


def handle_command(command: str, get_connection):

    parsed = parse_command(command)

    intent = parsed["intent"]
    product = parsed["product"]
    quantity = parsed["quantity"]


    if not product:
        return {
            "message": "Wala akong maintindihang product. Pakisabi ulit.",
            "type": "error"
        }

    if quantity is None:
        quantity = 1

    conn = get_connection()
    cur = conn.cursor()

    try:

        product = product.lower().strip()

    
        if intent == "CHECK":

            cur.execute("""
                SELECT stock FROM products
                WHERE LOWER(name)=%s
            """, (product,))

            result = cur.fetchone()

            if not result:
                return {
                    "message": f"Wala akong nakita na product na '{product}'",
                    "type": "error"
                }

            return {
                "message": f"{product} has {result[0]} in stock",
                "stock": result[0],
                "type": "success"
            }

     
        if intent == "SALE":

            cur.execute("""
                SELECT stock, price FROM products
                WHERE LOWER(name)=%s
            """, (product,))

            item = cur.fetchone()

            if not item:
                return {
                    "message": f"Product not found: {product}",
                    "type": "error"
                }

            stock, price = item

            if stock < quantity:
                return {
                    "message": "Not enough stock",
                    "type": "error"
                }

            new_stock = stock - quantity

            cur.execute("""
                UPDATE products
                SET stock=%s
                WHERE LOWER(name)=%s
            """, (new_stock, product))

            total = quantity * float(price)

            cur.execute("""
                INSERT INTO sales_transactions
                (product_name, quantity, total_price)
                VALUES (%s, %s, %s)
            """, (product, quantity, total))

            conn.commit()

            return {
                "message": f"Sold {quantity} {product}",
                "remaining_stock": new_stock,
                "type": "success"
            }


        if intent == "RESTOCK":

            cur.execute("""
                SELECT stock FROM products
                WHERE LOWER(name)=%s
            """, (product,))

            existing = cur.fetchone()

           
            if existing:

                cur.execute("""
                    UPDATE products
                    SET stock = stock + %s
                    WHERE LOWER(name)=%s
                """, (quantity, product))

                conn.commit()

                return {
                    "message": f"Added {quantity} stock to {product}",
                    "type": "success"
                }

          
            else:

                cur.execute("""
                    INSERT INTO products (name, price, stock)
                    VALUES (%s, %s, %s)
                """, (product, 0, quantity))

                conn.commit()

                return {
                    "message": f"Created new product '{product}' with stock {quantity}",
                    "type": "success"
                }

     
        return {
            "message": "Command not recognized",
            "type": "error"
        }

    finally:
        cur.close()
        conn.close()