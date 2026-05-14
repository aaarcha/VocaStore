from backend.services.text_normalizer import normalize_numbers

def parse_command(command):

    command = command.lower().strip()

    command = normalize_numbers(command)

    words = command.split()

    result = {
        "intent": None,
        "product": None,
        "quantity": 1
    }

    if "benta" in words or "sell" in words:
        result["intent"] = "SALE"

    elif "add" in words or "dagdag" in words:
        result["intent"] = "RESTOCK"

    elif "stock" in words or "ilan" in words:
        result["intent"] = "CHECK"

    for word in words:

        if word.isdigit():
            result["quantity"] = int(word)

    ignore = [
        "benta",
        "sell",
        "add",
        "dagdag",
        "stock",
        "ilan"
    ]

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