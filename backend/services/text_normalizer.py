import re

NUMBER_MAP = {
    "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4,
    "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "isa": 1, "dalawa": 2, "tatlo": 3, "apat": 4, "lima": 5,
    "anim": 6, "pito": 7, "walo": 8, "siyam": 9, "sampu": 10
}

def normalize_numbers(text: str):
    words = text.lower().split()
    return " ".join([str(NUMBER_MAP[w]) if w in NUMBER_MAP else w for w in words])