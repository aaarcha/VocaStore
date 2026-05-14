from backend.services.text_normalizer import normalize_numbers


def parse_command(command: str):

    command = command.lower().strip()

    # normalize Tagalog numbers → digits
    command = normalize_numbers(command)

    # unify common phrases
    command = command.replace("naka benta", "nakabenta")

    words = command.split()

    result = {
        "intent": None,
        "product": None,
        "quantity": 1
    }

    # -------------------------
    # INTENT WORDS
    # -------------------------
    sale_words = [
        "benta",
        "sell",
        "sold",
        "nakabenta"
    ]

    restock_words = [
        "add",
        "dagdag",
        "restock"
    ]

    check_words = [
        "stock",
        "ilan",
        "check",
        "how",
        "many"
    ]

    ignore_words = [
        "ng",
        "ako",
        "may",
        "ang",
        "na",
        "ko",
        "naka",
        "po",
        "sa",
        "yung",
        "ito",
        "the"
    ]

    # -------------------------
    # INTENT DETECTION
    # -------------------------
    if any(w in words for w in sale_words):
        result["intent"] = "SALE"

    elif any(w in words for w in restock_words):
        result["intent"] = "RESTOCK"

    elif any(w in words for w in check_words):
        result["intent"] = "CHECK"

    # -------------------------
    # QUANTITY DETECTION
    # -------------------------
    for word in words:
        if word.isdigit():
            result["quantity"] = int(word)
            break

    # -------------------------
    # PRODUCT DETECTION
    # -------------------------
    ignore = set(
        sale_words +
        restock_words +
        check_words +
        ignore_words
    )

    products = []

    for word in words:

        if word.isdigit():
            continue

        if word in ignore:
            continue

        products.append(word)

    if products:
        result["product"] = " ".join(products)

    return result