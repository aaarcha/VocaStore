NUMBER_MAP = {
    "isa": "1",
    "isang": "1",

    "dalawa": "2",
    "dalawang": "2",

    "tatlo": "3",
    "tatlong": "3",

    "apat": "4",
    "apat na": "4",

    "lima": "5",
    "limang": "5",

    "anim": "6",
    "anim na": "6",

    "pito": "7",
    "pitong": "7",

    "walo": "8",
    "walong": "8",

    "siyam": "9",
    "siyam na": "9",

    "sampu": "10",
    "sampung": "10"
}


def normalize_numbers(text: str):

    text = text.lower()

    # replace multi-word numbers FIRST
    for key in ["apat na", "anim na", "pitong", "walong", "siyam na", "sampung"]:
        if key in text:
            text = text.replace(key, NUMBER_MAP[key])

    words = text.split()

    normalized = []

    for word in words:
        normalized.append(NUMBER_MAP.get(word, word))

    return " ".join(normalized)