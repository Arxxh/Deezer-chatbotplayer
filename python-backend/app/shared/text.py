from __future__ import annotations

import re
import unicodedata


def normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value.strip().lower())
    without_diacritics = "".join(
        character
        for character in normalized
        if unicodedata.category(character) != "Mn"
    )
    compacted_spaces = re.sub(r"\s+", " ", without_diacritics)
    return compacted_spaces.strip()


def normalize_title(value: str) -> str:
    return sanitize_search_text(strip_featuring_clauses(value))


def sanitize_search_text(value: str) -> str:
    normalized = normalize_text(value)
    cleaned = re.sub(r"[^\w\s]", " ", normalized, flags=re.UNICODE)
    return re.sub(r"\s+", " ", cleaned).strip()


def strip_featuring_clauses(value: str) -> str:
    return re.sub(r"\((feat|ft)\.[^)]+\)", "", value, flags=re.IGNORECASE).strip()
