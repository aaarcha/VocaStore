NUMBER_MAP = {
    "isa": "1",
    "dalawa": "2",
    "tatlo": "3",
    "apat": "4",
    "lima": "5",
    "anim": "6",
    "pito": "7",
    "walo": "8",
    "siyam": "9",
    "sampu": "10"
}

def normalize_numbers(text):

    words = text.split()

    normalized = []

    for word in words:

        normalized.append(
            NUMBER_MAP.get(word, word)
        )

    return " ".join(normalized)