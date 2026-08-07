"""
Split calculation engine.

All amounts are in the group's canonical currency (after FX conversion).
Rounding strategy: ROUND_DOWN each share, then distribute remainder units
to the first N users (sorted by user_id ascending) — deterministic and
always sums exactly to the total. Never use float.
"""
from decimal import Decimal, ROUND_DOWN
from typing import Dict, List, Optional, Tuple

# Currencies that have no fractional units (e.g. JPY, KRW)
NO_DECIMAL_CURRENCIES = frozenset({
    "JPY", "KRW", "VND", "CLP", "ISK", "UGX", "RWF", "BIF",
    "GNF", "MGA", "PYG", "XAF", "XOF", "XPF",
})


def decimal_places(currency: str) -> int:
    return 0 if currency.upper() in NO_DECIMAL_CURRENCIES else 2


def quantum(currency: str) -> Decimal:
    return Decimal(10) ** -decimal_places(currency)


def _distribute_remainder(
    amounts: Dict[int, Decimal], total: Decimal, unit: Decimal
) -> Dict[int, Decimal]:
    """Add/subtract unit remainders to first N user_ids (sorted) until sum == total."""
    assigned = sum(amounts.values())
    remainder = total - assigned
    if remainder == 0:
        return amounts
    steps = int(abs(remainder) / unit)
    direction = unit if remainder > 0 else -unit
    sorted_ids = sorted(amounts.keys())
    n = len(sorted_ids)
    for i in range(steps):
        amounts[sorted_ids[i % n]] += direction
    return amounts


def split_equal(
    total: Decimal, user_ids: List[int], currency: str
) -> Dict[int, Decimal]:
    if not user_ids:
        return {}
    n = len(user_ids)
    unit = quantum(currency)
    each = (total / n).quantize(unit, rounding=ROUND_DOWN)
    amounts = {uid: each for uid in user_ids}
    return _distribute_remainder(amounts, total, unit)


def split_exact(
    total: Decimal,
    amounts: Dict[int, Decimal],
    currency: str,
) -> Tuple[Optional[Dict[int, Decimal]], Optional[str]]:
    unit = quantum(currency)
    total_given = sum(amounts.values())
    diff = abs(total - total_given)
    if diff > unit:
        return None, (
            f"Exact amounts sum to {total_given}, but expense total is {total}. "
            f"Difference: {total - total_given}"
        )
    return {uid: amt for uid, amt in amounts.items()}, None


def split_percentage(
    total: Decimal,
    percentages: Dict[int, Decimal],
    currency: str,
) -> Tuple[Optional[Dict[int, Decimal]], Optional[str]]:
    pct_sum = sum(percentages.values())
    if abs(pct_sum - Decimal("100")) > Decimal("0.01"):
        return None, (
            f"Percentages sum to {pct_sum}%, must equal 100%. "
            f"Off by {Decimal('100') - pct_sum}%"
        )
    unit = quantum(currency)
    amounts: Dict[int, Decimal] = {}
    for uid, pct in percentages.items():
        amounts[uid] = (total * pct / 100).quantize(unit, rounding=ROUND_DOWN)
    amounts = _distribute_remainder(amounts, total, unit)
    return amounts, None


def split_shares(
    total: Decimal,
    shares: Dict[int, Decimal],
    currency: str,
) -> Tuple[Optional[Dict[int, Decimal]], Optional[str]]:
    total_shares = sum(shares.values())
    if total_shares <= 0:
        return None, "Total shares must be positive."
    unit = quantum(currency)
    amounts: Dict[int, Decimal] = {}
    for uid, s in shares.items():
        amounts[uid] = (total * s / total_shares).quantize(unit, rounding=ROUND_DOWN)
    amounts = _distribute_remainder(amounts, total, unit)
    return amounts, None


def calculate_split(
    total: Decimal,
    currency: str,
    split_type: str,
    split_among: List[int],
    split_details: Optional[Dict[str, Decimal]] = None,
) -> Tuple[Optional[Dict[int, Decimal]], Optional[Dict[int, Decimal]], Optional[str]]:
    """
    Returns (split_amounts, split_raw, error_message).
    split_amounts: {user_id: Decimal} in group currency.
    split_raw: {user_id: Decimal} raw user input (for display).
    """
    if not split_among:
        return None, None, "split_among must contain at least one user."

    if split_type == "equal":
        amounts = split_equal(total, split_among, currency)
        return amounts, None, None

    if split_details is None:
        return None, None, f"split_details is required for split_type={split_type}"

    # Normalise keys to int
    details: Dict[int, Decimal] = {int(k): Decimal(str(v)) for k, v in split_details.items()}

    # Validate split_among matches split_details keys
    missing = set(split_among) - set(details.keys())
    extra = set(details.keys()) - set(split_among)
    if missing:
        return None, None, f"split_details missing entries for user_ids: {sorted(missing)}"
    if extra:
        return None, None, f"split_details has extra user_ids not in split_among: {sorted(extra)}"

    raw = dict(details)

    if split_type == "exact":
        amounts, err = split_exact(total, details, currency)
        return amounts, raw, err

    if split_type == "percentage":
        amounts, err = split_percentage(total, details, currency)
        return amounts, raw, err

    if split_type == "shares":
        amounts, err = split_shares(total, details, currency)
        return amounts, raw, err

    return None, None, f"Unknown split_type: {split_type}"
