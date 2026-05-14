import re
from backend.services.text_normalizer import normalize_numbers

# -----------------------------
# INTENT DETECTION (SMART v7)
# -----------------------------
def detect_intent(text: str):
    text = text.lower()

    # CHECK FIRST (important for "meron bang", "ilang")
    if any(w in text for w in [
        "ilang", "meron", "may", "check", "stock", "ba", "available"
    ]):
        return "CHECK"

    if any(w in text for w in [
        "benta", "sold", "nabenta", "nagbenta", "bumili"
    ]):
        return "SALE"

    if any(w in text for w in [
        "dagdag", "restock", "add", "magdagdag", "lagay"
    ]):
        return "RESTOCK"

    return "CHECK"  # fallback = safest for chat-like behavior


# -----------------------------
# PRODUCT RESOLVER (FIXED NLP)
# prevents: "coke ilan" bug
# -----------------------------
def extract_product(text: str):
    text = normalize_numbers(text.lower())

    stopwords = {
        "benta", "ko", "ng", "ang", "sa", "po", "please",
        "ilang", "meron", "bang", "may", "stock", "check",
        "add", "dagdag", "restock", "sold", "nagbenta",
        "how", "many", "ba", "ilan"
    }

    # remove numbers
    text = re.sub(r"\d+", "", text)

    words = text.split()

    filtered = [w for w in words if w not in stopwords]

    product = " ".join(filtered).strip()

    return product if product else None


# -----------------------------
# QUANTITY DETECTION
# -----------------------------
def extract_quantity(text: str):
    match = re.search(r"\d+", text)
    return int(match.group()) if match else 1


# -----------------------------
# MAIN PARSER v7
# -----------------------------
def parse_command(command: str):

    text = normalize_numbers(command.lower().strip())

    intent = detect_intent(text)
    product = extract_product(text)
    quantity = extract_quantity(text)

    return {
        "intent": intent,
        "product": product,
        "quantity": quantity
    }