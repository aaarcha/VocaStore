import re
from backend.services.text_normalizer import normalize_numbers

def to_proper_case(text: str) -> str:
    """Convert a string to Proper Case for product names."""
    stop_words = {"ng", "na", "at", "sa", "ang", "ni", "para", "and", "the", "of", "a"}
    words = text.split()
    result = []
    for i, w in enumerate(words):
        result.append(w if (i > 0 and w.lower() in stop_words) else w.capitalize())
    return " ".join(result)


def parse_command(command: str):

    original = command.strip()
    command  = command.lower().strip()
    command  = normalize_numbers(command)   # converts "dalawang" → "2", "two" → "2" etc.
    command  = command.replace("naka benta", "nakabenta")

    words = command.split()

    result = {
        "intent":   None,
        "product":  None,
        "quantity": 1,
        "price":    None
    }

    # ── INTENT WORDS ─────────────────────────────────────────────────────
    sale_words    = ["benta", "sell", "sold", "nakabenta", "ibenta"]
    restock_words = ["add", "dagdag", "restock", "magdagdag", "ilagay", "new"]
    check_words   = ["stock", "ilan", "check", "how", "many", "tingnan", "ilang"]
    price_words   = ["price", "presyo", "pesos", "peso", "php", "worth"]

    # "stock" only means CHECK when NOT followed by a number
    stock_as_quantity = any(
        words[i] == "stock" and i + 1 < len(words) and words[i + 1].isdigit()
        for i in range(len(words))
    )
    check_words_active = [w for w in check_words if not (w == "stock" and stock_as_quantity)]

    ignore_words = [
        "ng", "ako", "may", "ang", "na", "ko", "naka", "po",
        "sa", "yung", "ito", "the", "of", "is", "at", "a",
        "new", "item", "product", "with", "produkto", "bagong"
    ]

    # ── INTENT DETECTION ─────────────────────────────────────────────────
    if any(w in words for w in sale_words):
        result["intent"] = "SALE"
    elif any(w in words for w in restock_words):
        result["intent"] = "RESTOCK"
    elif any(w in words for w in check_words_active):
        result["intent"] = "CHECK"

    # ── PRICE DETECTION ──────────────────────────────────────────────────
    price_number_strs = set()

    for i, word in enumerate(words):
        if word in price_words:
            if i + 1 < len(words) and words[i + 1].replace(".", "", 1).isdigit():
                result["price"] = float(words[i + 1])
                price_number_strs.add(words[i + 1])
                break
            if i - 1 >= 0 and words[i - 1].replace(".", "", 1).isdigit():
                result["price"] = float(words[i - 1])
                price_number_strs.add(words[i - 1])
                break

    # ── STOCK / QUANTITY DETECTION ────────────────────────────────────────
    stock_qty_found = False
    for i, word in enumerate(words):
        if word == "stock" and i + 1 < len(words) and words[i + 1].isdigit():
            if words[i + 1] not in price_number_strs:
                result["quantity"] = int(words[i + 1])
                stock_qty_found = True
                break

    if not stock_qty_found:
        intent_trigger_words = set(sale_words + restock_words + check_words)
        # Find the index of the first intent word, then look for a digit AFTER it
        trigger_idx = -1
        for i, w in enumerate(words):
            if w in intent_trigger_words:
                trigger_idx = i
                break

        found_qty = False
        if trigger_idx >= 0:
            for word in words[trigger_idx + 1:]:
                if word.isdigit() and word not in price_number_strs:
                    result["quantity"] = int(word)
                    found_qty = True
                    break

        # Fallback: any digit in the sentence (avoids picking up price digits)
        if not found_qty:
            for word in words:
                if word.isdigit() and word not in price_number_strs:
                    result["quantity"] = int(word)
                    break

    # ── PRODUCT DETECTION ─────────────────────────────────────────────────
    qty_str = str(result["quantity"])

    ignore = set(
        sale_words + restock_words + check_words +
        price_words + ignore_words
    )
    if stock_qty_found:
        ignore.add("stock")

    product_words = [
        word for word in words
        if word != qty_str                          # ← exclude the resolved quantity digit
        and not word.replace(".", "", 1).isdigit()  # exclude all other raw numbers / prices
        and word not in ignore
    ]

    if product_words:
        raw_lower = " ".join(product_words)
        result["product"] = to_proper_case(raw_lower)

    return result