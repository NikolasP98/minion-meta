#!/usr/bin/env python3
"""
Validate that all must-preserve constraints survived transformation.

Compares original text constraints against transformed text.
Exit code 0 = all constraints preserved, 1 = missing constraints.

Usage:
    python validate_preservation.py original.txt transformed.txt
    python validate_preservation.py original.txt transformed.txt constraints.json
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import TypedDict

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from extract_constraints import extract_constraints, Constraint


class ValidationResult(TypedDict):
    passed: bool
    total_constraints: int
    preserved: int
    missing: list[Constraint]
    warnings: list[str]


_MAGNITUDES = {
    "k": 1e3, "thousand": 1e3,
    "m": 1e6, "million": 1e6,
    "b": 1e9, "billion": 1e9,
    "trillion": 1e12,
}

_MONTHS = [
    "january", "february", "march", "april", "may", "june", "july",
    "august", "september", "october", "november", "december",
]

_MONTH_NUMBERS = {month: index for index, month in enumerate(_MONTHS, start=1)}
_MAGNITUDE_PATTERN = r"trillion|billion|million|thousand|[kmb]"


def normalize_value(value: str) -> str:
    """Normalize a constraint value for comparison."""
    # Remove extra whitespace
    normalized = re.sub(r'\s+', ' ', value.strip())
    # Lowercase for comparison (preserve original for display)
    return normalized.lower()


def parse_money(token: str) -> float | None:
    """Parse a currency token into an absolute amount, honoring magnitude words.

    '$47.3M' and '$47.3 million' -> 47_300_000; '$47.3 billion' -> 47_300_000_000.
    Magnitude is part of the fact, so the two must not compare equal.
    """
    m = re.fullmatch(
        rf'\s*\$?\s*([\d,]+(?:\.\d*)?)\s*({_MAGNITUDE_PATTERN})?\s*',
        token.lower(),
    )
    if not m or not m.group(1).strip(","):
        return None
    amount = float(m.group(1).replace(",", ""))
    if m.group(2):
        amount *= _MAGNITUDES[m.group(2)]
    return amount


def parse_magnitude_number(token: str) -> float | None:
    m = re.fullmatch(
        r'\s*([\d,]+(?:\.\d*)?)\s*(thousand|million|billion|trillion)?\s*',
        token.lower(),
    )
    if not m or not m.group(1).strip(","):
        return None
    amount = float(m.group(1).replace(",", ""))
    if m.group(2):
        amount *= _MAGNITUDES[m.group(2)]
    return amount


def _numbers_match_exactly(value: str, text: str, pattern: str) -> bool:
    """True iff the numeric value appears as a whole quantity in text.

    Guards against the substring trap where '12' is 'found' inside '120'.
    """
    want = re.findall(r'\d+\.?\d*', value)
    have = set(re.findall(pattern, text.lower()))
    return all(num in have for num in want) and bool(want)


def _contains_bounded(value: str, text: str) -> bool:
    """Match a literal without accepting it inside a larger word or number."""
    left = r"(?<!\w)" if value and value[0].isalnum() else ""
    right = r"(?!\w)" if value and value[-1].isalnum() else ""
    return re.search(left + re.escape(value) + right, text, re.IGNORECASE) is not None


def _parse_date(value: str) -> tuple[int, int, int] | None:
    iso = re.fullmatch(r"\s*(\d{4})-(\d{2})-(\d{2})\s*", value)
    if iso:
        return tuple(int(part) for part in iso.groups())

    natural = re.fullmatch(
        r"\s*([A-Za-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\s*",
        value,
        re.IGNORECASE,
    )
    if not natural:
        return None
    month_token, day, year = natural.groups()
    month = next(
        (number for name, number in _MONTH_NUMBERS.items() if name.startswith(month_token.lower()[:3])),
        None,
    )
    return (int(year), month, int(day)) if month is not None else None


def _dates_in_text(text: str) -> set[tuple[int, int, int]]:
    candidates = re.findall(r"\b\d{4}-\d{2}-\d{2}\b", text)
    candidates.extend(
        match.group()
        for match in re.finditer(
            r"\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
            r"Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|"
            r"Dec(?:ember)?)\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}\b",
            text,
            re.IGNORECASE,
        )
    )
    return {parsed for candidate in candidates if (parsed := _parse_date(candidate)) is not None}


_UNIT_SYNONYMS = {
    "km": {"km", "kilometer", "kilometers", "kilometre", "kilometres"},
    "mi": {"mi", "mile", "miles"},
    "kg": {"kg", "kilogram", "kilograms"},
    "g": {"g", "gram", "grams"},
    "ms": {"ms", "millisecond", "milliseconds"},
    "s": {"s", "sec", "second", "seconds"},
    "m": {"m", "meter", "meters", "metre", "metres"},
    "cm": {"cm", "centimeter", "centimeters", "centimetre", "centimetres"},
    "mm": {"mm", "millimeter", "millimeters", "millimetre", "millimetres"},
    "ft": {"ft", "foot", "feet"},
    "in": {"in", "inch", "inches"},
    "lb": {"lb", "lbs", "pound", "pounds"},
    "oz": {"oz", "ounce", "ounces"},
    "°c": {"°c", "c", "celsius"},
    "°f": {"°f", "f", "fahrenheit"},
    "min": {"min", "mins", "minute", "minutes"},
    "hr": {"hr", "hrs", "hour", "hours"},
    "day": {"day", "days"},
    "week": {"week", "weeks", "wk", "wks"},
    "month": {"month", "months", "mo"},
    "year": {"year", "years", "yr", "yrs"},
    "kb": {"kb", "kilobyte", "kilobytes"},
    "mb": {"mb", "megabyte", "megabytes"},
    "gb": {"gb", "gigabyte", "gigabytes"},
    "tb": {"tb", "terabyte", "terabytes"},
    "pb": {"pb", "petabyte", "petabytes"},
    "px": {"px", "pixel", "pixels"},
}


def _measurement_parts(value: str) -> tuple[str, set[str]] | None:
    m = re.search(r'(\d+\.?\d*)\s*([^\d\s]+|degrees?(?:\s+\w+)?)', value, re.I)
    if not m:
        return None
    unit = m.group(2).lower().strip()
    unit = re.sub(r'^degrees?\s*', '', unit) or "degree"
    aliases = _UNIT_SYNONYMS.get(unit)
    if aliases is None:
        for family in _UNIT_SYNONYMS.values():
            if unit in family:
                aliases = family
                break
        else:
            aliases = {unit}
    return m.group(1), aliases


def _quote_core(value: str) -> str:
    return value.strip().strip('"“”').lower()


_TIME_RE = re.compile(
    r"\b(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?\s*(UTC|PST|EST|CST|MST|GMT)?\b",
    re.IGNORECASE,
)


def _normalize_time(match: re.Match[str]) -> tuple[int, int, int, str | None] | None:
    hour, minute, second = (int(match.group(index) or 0) for index in (1, 2, 3))
    meridiem = (match.group(4) or "").lower()
    zone = match.group(5).upper() if match.group(5) else None
    if minute > 59 or second > 59 or hour > (12 if meridiem else 23) or hour == 0 and meridiem:
        return None
    if meridiem:
        hour = hour % 12 + (12 if meridiem == "pm" else 0)
    return hour, minute, second, zone


def _times_in_text(text: str) -> set[tuple[int, int, int, str | None]]:
    return {
        normalized
        for match in _TIME_RE.finditer(text)
        if (normalized := _normalize_time(match)) is not None
    }


def find_constraint_in_text(constraint: Constraint, text: str) -> bool:
    """Check if a constraint value exists in text."""
    value = constraint["value"]
    ctype = constraint["type"]
    normalized_value = normalize_value(value)
    normalized_text = normalize_value(text)

    # and/or: the disjunction must survive; "or" (or "or both") is faithful,
    # a bare conjunction is not.
    if ctype == "and_or":
        return bool(re.search(r"\band/or\b|\bor\b", text, re.IGNORECASE))

    # Currency: compare absolute amounts so a magnitude swap (M -> billion) fails.
    if ctype == "currency":
        target = parse_money(value)
        if target is None:
            return False
        for token in re.findall(
            rf'\$[\d,]+(?:\.\d*)?\s*(?:{_MAGNITUDE_PATTERN})?\b', text, re.IGNORECASE
        ):
            amount = parse_money(token)
            if amount is not None and abs(amount - target) < 0.01:
                return True
        return False

    if ctype == "magnitude_number":
        target = parse_magnitude_number(value)
        if target is None:
            return False
        for token in re.findall(
            r'\b[\d,]+(?:\.\d*)?\s*(?:thousand|million|billion|trillion)\b',
            text,
            re.IGNORECASE,
        ):
            amount = parse_magnitude_number(token)
            if amount is not None and abs(amount - target) < 0.01:
                return True
        return False

    # Percentage: require an exact numeric match (12% != 120%).
    if ctype == "percentage":
        return _numbers_match_exactly(value, text, r'(\d+\.?\d*)\s*(?:%|percent)')

    if ctype == "measurement":
        parts = _measurement_parts(value)
        if not parts:
            return False
        number, units = parts
        clean_text = text.replace(",", "").lower()
        amount = re.escape(number.replace(",", ""))
        return any(
            re.search(
                r"(?<![\d.])" + amount + r"(?![\d.])\s*" + re.escape(unit) + r"(?!\w)",
                clean_text,
            )
            is not None
            for unit in units
        )

    if ctype == "range":
        parts = re.findall(r"\d+(?:\.\d*)?", value)
        if len(parts) != 2:
            return False
        suffix_match = re.search(r"\d\s*(K|M|B|%|years?|months?|days?)\s*$", value, re.IGNORECASE)
        suffix = r"\s*" + re.escape(suffix_match.group(1)) + r"\b" if suffix_match else ""
        return re.search(
            r"(?<![\d.])"
            + re.escape(parts[0])
            + r"(?![\d.])\s*[-–]\s*(?<![\d.])"
            + re.escape(parts[1])
            + r"(?![\d.])"
            + suffix,
            text,
            re.IGNORECASE,
        ) is not None

    if ctype == "time":
        target = next(iter(_times_in_text(value)), None)
        return target is not None and target in _times_in_text(text)

    # Other quantities: match digits, comma-insensitive, but as whole tokens.
    if ctype == "count":
        count = re.fullmatch(r"\s*([\d,]+)\s+([A-Za-z]+)\s*", value)
        if not count:
            return False
        number, noun = count.groups()
        clean_number = number.replace(",", "")
        clean_text = text.replace(",", "")
        return re.search(
            r"(?<![\d.])" + re.escape(clean_number) + r"(?![\d.])\s+" + re.escape(noun) + r"\b",
            clean_text,
            re.IGNORECASE,
        ) is not None

    if ctype == "number":
        for num in re.findall(r'[\d,]+\.?\d*', value):
            clean_num = num.replace(",", "")
            if re.search(r'(?<![\d.])' + re.escape(clean_num) + r'(?![\d.])',
                         text.replace(",", "")):
                return True
        return False

    # Dates: the year alone is not enough — a changed month is a changed fact.
    if ctype == "date_quarter":
        target = re.fullmatch(r"\s*Q([1-4])\s+(\d{4})\s*", value, re.IGNORECASE)
        if not target:
            return False
        quarter, year = target.groups()
        ordinal = {"1": "first", "2": "second", "3": "third", "4": "fourth"}[quarter]
        return re.search(
            rf"(?:\bQ{quarter}\s+{year}\b|\b{ordinal}\s+quarter(?:\s+of)?\s+{year}\b)",
            text,
            re.IGNORECASE,
        ) is not None

    if ctype in ("date_iso", "date_natural"):
        target = _parse_date(value)
        return target is not None and target in _dates_in_text(text)

    if ctype == "year":
        return _contains_bounded(value, text)

    # For quotes, check if core content is present (without surrounding quotes)
    if ctype == "quote":
        inner = _quote_core(value)
        comparable_text = normalized_text.replace("“", '"').replace("”", '"')
        if inner in comparable_text:
            return True

    if ctype == "proper_noun":
        phrase = r"\s+".join(re.escape(word) for word in value.split())
        return re.search(r"(?<!\w)" + phrase + r"(?!\w)", text, re.IGNORECASE) is not None

    # Textual constraints still need a bounded literal match. This sits after
    # numeric/date-specific checks so a substring cannot bypass their semantics.
    if _contains_bounded(normalized_value, normalized_text):
        return True

    return False


_NEGATION_RE = re.compile(
    r"\b(?:not|never|no|cannot|can't|won't|don't|doesn't|didn't|isn't|aren't|"
    r"wasn't|weren't|without|neither|nor|none|fails?\s+to|rather\s+than)\b", re.I)
_SCOPE_RE = re.compile(
    r"\b(?:most|all|none|every|each|some|few|several|majority|minority|only|"
    r"always|usually|typically|rarely|approximately|roughly|about|nearly)\b", re.I)
_CONDITIONAL_RE = re.compile(
    r"\b(?:if|unless|provided\s+that|only\s+if|assuming|given\s+that|"
    r"in\s+the\s+event|contingent\s+on|except|excluding|other\s+than|"
    r"aside\s+from|save\s+for)\b", re.I)
_WEAK_MODAL_RE = re.compile(
    r"\b(?:may|might|could|should|can|likely|probably|appears?|suggests?|seems?)\b", re.I)
_STRONG_MODAL_RE = re.compile(
    r"\b(?:will|must|always|definitely|certainly|guarantees?|proves?)\b", re.I)


def semantic_drift_warnings(original: str, transformed: str) -> list[str]:
    """Warn when meaning-bearing words present in the original vanish in the rewrite."""
    out: list[str] = []
    o, t = original.lower(), transformed.lower()

    on, tn = len(_NEGATION_RE.findall(o)), len(_NEGATION_RE.findall(t))
    if on > tn:
        out.append(
            f"Negation count dropped {on}->{tn}. Verify no claim was inverted or "
            "weakened (e.g. 'does not support' -> 'supports').")

    missing_scope = sorted({w for w in _SCOPE_RE.findall(o)} - {w for w in _SCOPE_RE.findall(t)})
    for w in missing_scope:
        out.append(f"Scope/precision word '{w}' not in output. Verify the claim's scope is unchanged.")

    oc, tc = len(_CONDITIONAL_RE.findall(o)), len(_CONDITIONAL_RE.findall(t))
    if oc > tc:
        out.append(
            f"Conditional count dropped {oc}->{tc}. Verify a conditional claim "
            "wasn't turned into an unconditional one.")

    ow, tw = len(_WEAK_MODAL_RE.findall(o)), len(_WEAK_MODAL_RE.findall(t))
    os, ts = len(_STRONG_MODAL_RE.findall(o)), len(_STRONG_MODAL_RE.findall(t))
    if ow > tw and ts > os:
        out.append("Hedged claim may have been strengthened. Verify uncertainty was not turned into certainty.")

    return out


def validate_preservation(
    original_text: str,
    transformed_text: str,
    constraints: list[Constraint] | None = None
) -> ValidationResult:
    """Validate that all constraints are preserved in transformed text."""

    if constraints is None:
        constraints = extract_constraints(original_text)

    missing: list[Constraint] = []
    warnings: list[str] = []

    for constraint in constraints:
        if not find_constraint_in_text(constraint, transformed_text):
            missing.append(constraint)

    # Generate warnings for near-misses
    for m in missing:
        if m["type"] == "percentage":
            # Check if number exists without %
            num = re.search(r'[\d.]+', m["value"])
            if num and num.group() in transformed_text:
                warnings.append(f"Number {num.group()} found but missing '%' symbol")

    # Semantic drift warnings. These are NOT numbers/names — they are the
    # meaning-bearing words (negations, scope, conditionals) that the skill's
    # de-hedging rules are most likely to delete and that pure fact-matching
    # cannot see. Surfaced as warnings so the rewrite gets a human re-check;
    # de-slopping legitimately removes some, so they don't hard-fail on their own.
    warnings.extend(semantic_drift_warnings(original_text, transformed_text))

    preserved = len(constraints) - len(missing)

    return {
        "passed": len(missing) == 0,
        "total_constraints": len(constraints),
        "preserved": preserved,
        "missing": missing,
        "warnings": warnings
    }


def main() -> None:
    args = sys.argv[1:]
    strict = False
    if args and args[0] == "--strict":
        strict = True
        args = args[1:]

    if len(args) < 2:
        print("Usage: validate_preservation.py <original.txt> <transformed.txt> [constraints.json]")
        sys.exit(1)

    # Read inputs
    try:
        with open(args[0], 'r') as f:
            original_text = f.read()
        with open(args[1], 'r') as f:
            transformed_text = f.read()
    except OSError as e:
        print(json.dumps({"error": f"Could not read input: {e}"}))
        sys.exit(2)

    # Optionally read pre-computed constraints
    constraints = None
    if len(args) > 2:
        with open(args[2], 'r') as f:
            data = json.load(f)
            constraints = data.get("constraints", [])

    result = validate_preservation(original_text, transformed_text, constraints)

    # Output result
    output = {
        "passed": result["passed"],
        "total_constraints": result["total_constraints"],
        "preserved": result["preserved"],
        "missing_count": len(result["missing"]),
        "missing": result["missing"],
        "warnings": result["warnings"]
    }

    print(json.dumps(output, indent=2))

    # Exit with appropriate code
    sys.exit(0 if result["passed"] and not (strict and result["warnings"]) else 1)


if __name__ == "__main__":
    main()
