from backend.services.text_normalizer import normalize_numbers

def parse_command(command):

    command = command.lower().strip()

    command = normalize_numbers(command)

    command = command.replace("naka benta", "nakabenta")

    words = command.split()

    result = {
        "intent": None,
        "product": None,
        "quantity": 1
    }

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
        "check"
    ]

    ignore_words = [
        "ng",
        "ako",
        "may",
        "ang",
        "na",
        "ko",
        "naka"
    ]

    if any(word in words for word in sale_words):
        result["intent"] = "SALE"

    elif any(word in words for word in restock_words):
        result["intent"] = "RESTOCK"

    elif any(word in words for word in check_words):
        result["intent"] = "CHECK"

    for word in words:

        if word.isdigit():
            result["quantity"] = int(word)

    ignore = (
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