NUMBER_MAP = {
    # Tagalog
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
    "sampung": "10",

    # English number words (for voice recognition)
    "one": "1",
    "two": "2",
    "three": "3",
    "four": "4",
    "five": "5",
    "six": "6",
    "seven": "7",
    "eight": "8",
    "nine": "9",
    "ten": "10",
    "eleven": "11",
    "twelve": "12",
    "twenty": "20",
    "thirty": "30",
    "forty": "40",
    "fifty": "50",
    "hundred": "100"
}


def normalize_numbers(text: str):

    text = text.lower()

    # replace multi-word numbers FIRST
    for key in ["apat na", "anim na", "siyam na", "sampung", "pitong", "walong"]:
        if key in text:
            text = text.replace(key, NUMBER_MAP[key])

    words = text.split()

    normalized = []

    for word in words:
        normalized.append(NUMBER_MAP.get(word, word))

    return " ".join(normalized)