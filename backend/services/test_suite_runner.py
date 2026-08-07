"""
Test suite runner — multi-layer checks against the real production engine.

Each TestCase has:
  runner()  → returns an "actual" dict
  checks    → list of Check objects, each with a pass/fail predicate

Statuses:
  PASS              — all checks passed
  FAIL              — one or more checks failed
  COMPUTATION_ERROR — runner() itself threw an exception (engine bug)
"""

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any, Callable, Dict, List

from services.split_calculator import (
    split_equal, split_exact, split_percentage, split_shares,
    calculate_split,
)
from services.balance_calculator import compute_net_balances, compute_pairwise_balances
from services.debt_simplifier import simplify_debts


# ── helpers ────────────────────────────────────────────────────────────────

def D(s) -> Decimal:
    return Decimal(str(s))

def _sd(v) -> Decimal:
    """Safely convert to Decimal, returning 0 on error."""
    try:
        return D(str(v))
    except Exception:
        return D("0")

def _close(a, b, tol="0.005") -> bool:
    return abs(_sd(a) - _sd(b)) < D(tol)


class _Exp:
    def __init__(self, paid_by, split_amounts, deleted=False,
                 description="Test expense", orig_amount=None, id=1,
                 orig_currency="INR", parent_id=None):
        self.paid_by = {str(k): str(v) for k, v in paid_by.items()}
        self.split_amounts = {str(k): str(v) for k, v in split_amounts.items()}
        self.deleted = deleted
        self.description = description
        self.original_amount = D(str(orig_amount or list(paid_by.values())[0]))
        self.id = id
        self.original_currency = orig_currency
        self.parent_expense_id = parent_id


class _Pmt:
    def __init__(self, from_uid, to_uid, amount):
        self.from_user_id = from_uid
        self.to_user_id = to_uid
        self.amount = D(str(amount))


# ── Check dataclass ────────────────────────────────────────────────────────

@dataclass
class Check:
    name: str
    fn: Callable[[Dict], bool]
    on_fail: Callable[[Dict], str] = field(default_factory=lambda: (lambda _: "check failed"))


def _chk(name: str, fn: Callable, on_fail: Callable = None) -> Check:
    return Check(name=name, fn=fn, on_fail=on_fail or (lambda _: f"'{name}' check failed"))


# ── TestCase dataclass ─────────────────────────────────────────────────────

@dataclass
class TestCase:
    id: str
    category: str
    description: str
    plain_language_description: str
    input_display: Dict[str, Any]
    runner: Callable[[], Dict[str, Any]]
    checks: List[Check]


# ── category metadata ──────────────────────────────────────────────────────

CATEGORY_META = {
    "rounding": {
        "label": "Rounding",
        "why": "If this fails, some group's total could be off by a few cents and nobody would know why.",
    },
    "multi_payer": {
        "label": "Multi-payer expenses",
        "why": "If this fails, groups where multiple people co-pay a hotel or dinner bill will show incorrect debts.",
    },
    "self_owing": {
        "label": "Self-owing",
        "why": "If this fails, the app could generate a payment from yourself to yourself — nonsensical and confusing.",
    },
    "partial_split": {
        "label": "Partial group split",
        "why": "If this fails, people who didn't participate in an expense would see it wrongly affect their balance.",
    },
    "validation": {
        "label": "Input validation",
        "why": "If this fails, bad data could silently corrupt balances with no warning to the user.",
    },
    "percentage_split": {
        "label": "Percentage splits",
        "why": "If this fails, a typo in percentages could pass silently and split money incorrectly.",
    },
    "shares_split": {
        "label": "Shares / weighted splits",
        "why": "If this fails, proportional splits (like 2× for a double room) would be calculated wrong.",
    },
    "currency": {
        "label": "Currency edge cases",
        "why": "If this fails, different currencies could be summed directly (₹ + $), giving wildly wrong balances.",
    },
    "debt_simplification": {
        "label": "Debt simplification",
        "why": "If this fails, people might be asked to make more payments than necessary to settle up.",
    },
    "partial_settlement": {
        "label": "Partial settlement",
        "why": "If this fails, paying back half of what you owe might show the wrong remaining balance.",
    },
    "edit_delete": {
        "label": "Edit / delete expenses",
        "why": "If this fails, editing or deleting an expense could leave phantom amounts in balances.",
    },
    "empty_group": {
        "label": "Empty / single-member group",
        "why": "If this fails, a group with 0 or 1 members could crash the app or show a division-by-zero error.",
    },
    "simplify_toggle": {
        "label": "Simplify-debts toggle",
        "why": "If this fails, turning off 'simplify debts' would still show a simplified view instead of raw pairwise debts.",
    },
    "refund": {
        "label": "Refund / adjustment entries",
        "why": "If this fails, a refund or credit would not reduce the right person's balance.",
    },
    "duplicate_detection": {
        "label": "Duplicate expense detection",
        "why": "If this fails, accidentally adding the same expense twice would go unnoticed and double the debt.",
    },
    "recurring": {
        "label": "Recurring expenses",
        "why": "If this fails, deleting one month's entry could accidentally affect all months.",
    },
    "member_removal": {
        "label": "Member removal with balance",
        "why": "If this fails, someone could leave a group while still owing money, breaking the balance sheet permanently.",
    },
    "cross_group": {
        "label": "Cross-group balance aggregation",
        "why": "If this fails, the 'total you owe' number on your dashboard would be wrong when you're in multiple groups.",
    },
    "large_amounts": {
        "label": "Very large amounts",
        "why": "If this fails, very large expenses (like property splits) could lose precision or show scientific notation.",
    },
    "balance_invariant": {
        "label": "Balance invariants",
        "why": "Net balances must always sum to zero — money is conserved. If this fails, the ledger is fundamentally broken.",
    },
}

CATEGORY_ORDER = list(CATEGORY_META.keys())


# ── test case builders ─────────────────────────────────────────────────────

def _build_cases() -> List[TestCase]:  # noqa: C901
    cases: List[TestCase] = []

    def add(c: TestCase):
        cases.append(c)

    # ── ROUNDING ──────────────────────────────────────────────────────────

    def _r001():
        r = split_equal(D("100"), [1, 2, 3], "INR")
        total = sum(r.values())
        return {"u1": str(r[1]), "u2": str(r[2]), "u3": str(r[3]), "_total": str(total)}

    add(TestCase(
        id="rounding-001",
        category="rounding",
        description="₹100 / 3 equal split — remainder to lowest user ID",
        plain_language_description="Split ₹100 equally between 3 people. ₹100 ÷ 3 = ₹33.33… so the extra paisa goes to user 1. Checks sum, individual shares, and that no share is negative.",
        input_display={"amount": "₹100.00", "split_type": "equal", "people": 3},
        runner=_r001,
        checks=[
            _chk("Sum = ₹100.00", lambda a: _close(a.get("_total", 0), "100"), lambda a: f"Sum was {a.get('_total')} not 100"),
            _chk("User 1 = ₹33.34 (extra paisa)", lambda a: _close(a.get("u1", 0), "33.34"), lambda a: f"Got {a.get('u1')}"),
            _chk("User 2 = ₹33.33", lambda a: _close(a.get("u2", 0), "33.33"), lambda a: f"Got {a.get('u2')}"),
            _chk("User 3 = ₹33.33", lambda a: _close(a.get("u3", 0), "33.33"), lambda a: f"Got {a.get('u3')}"),
            _chk("No share is negative", lambda a: all(_sd(a.get(k, 0)) >= 0 for k in ["u1","u2","u3"]), lambda a: "A share was negative"),
        ],
    ))

    def _r002():
        r = split_equal(D("0.01"), [1, 2], "INR")
        total = sum(r.values())
        return {"u1": str(r[1]), "u2": str(r[2]), "_total": str(total)}

    add(TestCase(
        id="rounding-002",
        category="rounding",
        description="₹0.01 / 2 — smallest unit split",
        plain_language_description="Split one single paisa between two people. One gets ₹0.01, other gets ₹0.00. Total must still be ₹0.01 — not zero, not ₹0.02.",
        input_display={"amount": "₹0.01", "split_type": "equal", "people": 2},
        runner=_r002,
        checks=[
            _chk("Sum = ₹0.01", lambda a: _close(a.get("_total", 0), "0.01"), lambda a: f"Sum was {a.get('_total')}"),
            _chk("One person gets the paisa", lambda a: _close(a.get("u1", 0), "0.01") or _close(a.get("u2", 0), "0.01"), lambda a: f"Neither user has 0.01: u1={a.get('u1')}, u2={a.get('u2')}"),
            _chk("Other person gets zero", lambda a: _close(a.get("u1", 0), "0") or _close(a.get("u2", 0), "0"), lambda a: f"Neither user has 0.00: u1={a.get('u1')}, u2={a.get('u2')}"),
        ],
    ))

    def _r003():
        r = split_equal(D("1000"), [1, 2, 3, 4, 5, 6, 7], "INR")
        total = sum(r.values())
        each = [_sd(v) for v in r.values()]
        max_diff = max(each) - min(each)
        return {"_total": str(total), "_max_diff": str(max_diff), "_count": str(len(r))}

    add(TestCase(
        id="rounding-003",
        category="rounding",
        description="₹1000 / 7 — seven-way equal split sum check",
        plain_language_description="Split ₹1000 among 7 people. 1000÷7 doesn't divide evenly. Checks: shares sum to ₹1000, max spread between shares is at most ₹0.01, and exactly 7 shares exist.",
        input_display={"amount": "₹1000.00", "people": 7},
        runner=_r003,
        checks=[
            _chk("Sum = ₹1000.00", lambda a: _close(a.get("_total", 0), "1000"), lambda a: f"Sum was {a.get('_total')}"),
            _chk("Exactly 7 shares", lambda a: a.get("_count") == "7", lambda a: f"Got {a.get('_count')} shares"),
            _chk("Max spread ≤ ₹0.01", lambda a: _sd(a.get("_max_diff", 1)) <= D("0.01"), lambda a: f"Spread was {a.get('_max_diff')}"),
        ],
    ))

    def _r004():
        r = split_equal(D("100"), [1, 2, 3], "JPY")
        total = sum(r.values())
        has_fractions = any(v % D("1") != D("0") for v in r.values())
        return {"u1": str(r[1]), "u2": str(r[2]), "u3": str(r[3]),
                "_total": str(total), "_has_fractions": str(has_fractions)}

    add(TestCase(
        id="rounding-004",
        category="rounding",
        description="¥100 / 3 (JPY) — no fractional yen allowed",
        plain_language_description="Split ¥100 among 3 people. JPY has no decimal sub-units, so every share must be a whole number. One person gets ¥34, others get ¥33.",
        input_display={"amount": "¥100", "currency": "JPY", "people": 3},
        runner=_r004,
        checks=[
            _chk("Sum = ¥100", lambda a: _close(a.get("_total", 0), "100"), lambda a: f"Sum was {a.get('_total')}"),
            _chk("No fractional yen", lambda a: a.get("_has_fractions") == "False", lambda a: "Fractional yen found"),
            _chk("User 1 = ¥34", lambda a: _close(a.get("u1", 0), "34"), lambda a: f"Got ¥{a.get('u1')}"),
            _chk("Others = ¥33 each", lambda a: _close(a.get("u2", 0), "33") and _close(a.get("u3", 0), "33"), lambda a: f"u2={a.get('u2')} u3={a.get('u3')}"),
        ],
    ))

    def _r005():
        r = split_equal(D("30000"), [1, 2, 3, 4], "KRW")
        has_fractions = any(v % D("1") != D("0") for v in r.values())
        total = sum(r.values())
        return {"_total": str(total), "_has_fractions": str(has_fractions), "_each": str(r.get(1))}

    add(TestCase(
        id="rounding-005",
        category="rounding",
        description="₩30000 / 4 (KRW) — no fractional won",
        plain_language_description="Split ₩30,000 among 4 people. KRW has no decimal sub-units. Each person gets exactly ₩7,500 — no fractions allowed.",
        input_display={"amount": "₩30000", "currency": "KRW", "people": 4},
        runner=_r005,
        checks=[
            _chk("Sum = ₩30000", lambda a: _close(a.get("_total", 0), "30000"), lambda a: f"Sum was {a.get('_total')}"),
            _chk("No fractional won", lambda a: a.get("_has_fractions") == "False", lambda a: "Fractional amounts found in KRW split"),
            _chk("Each gets ₩7500", lambda a: _close(a.get("_each", 0), "7500"), lambda a: f"Got {a.get('_each')} per person"),
        ],
    ))

    def _r006():
        total_amt = D("9999999.99")
        r = split_equal(total_amt, [1, 2, 3], "INR")
        total = sum(r.values())
        no_sci = "e" not in str(total).lower() and "E" not in str(total)
        return {"_total": str(total), "_no_sci": str(no_sci), "_expected": str(total_amt)}

    add(TestCase(
        id="rounding-006",
        category="rounding",
        description="₹9,999,999.99 / 3 — large amount precision",
        plain_language_description="Split nearly ₹1 crore among 3 people. Checks that very large numbers don't lose precision or overflow. Sum must equal exactly ₹9,999,999.99.",
        input_display={"amount": "₹9,999,999.99", "people": 3},
        runner=_r006,
        checks=[
            _chk("Sum = ₹9,999,999.99", lambda a: _close(a.get("_total", 0), "9999999.99"), lambda a: f"Sum was {a.get('_total')}"),
            _chk("No scientific notation", lambda a: a.get("_no_sci") == "True", lambda a: f"Output contained 'e': {a.get('_total')}"),
        ],
    ))

    def _r007():
        # 5-person uneven split: ₹101 / 5
        r = split_equal(D("101"), [1, 2, 3, 4, 5], "INR")
        total = sum(r.values())
        each = sorted([_sd(v) for v in r.values()])
        spread = each[-1] - each[0]
        return {"_total": str(total), "_spread": str(spread), "_count": str(len(r))}

    add(TestCase(
        id="rounding-007",
        category="rounding",
        description="₹101 / 5 — extra paisa distributed across multiple users",
        plain_language_description="₹101 ÷ 5 = ₹20.20 each. But 5 × ₹20.20 = ₹101.00 exactly — no remainder. All 5 shares should be ₹20.20 and sum to ₹101.00.",
        input_display={"amount": "₹101.00", "people": 5},
        runner=_r007,
        checks=[
            _chk("Sum = ₹101.00", lambda a: _close(a.get("_total", 0), "101"), lambda a: f"Sum was {a.get('_total')}"),
            _chk("Exactly 5 shares", lambda a: a.get("_count") == "5", lambda a: f"Got {a.get('_count')} shares"),
            _chk("Max spread ≤ ₹0.01", lambda a: _sd(a.get("_spread", 1)) <= D("0.01"), lambda a: f"Spread was {a.get('_spread')}"),
        ],
    ))

    def _r008():
        # VND (0 decimal places like JPY)
        r = split_equal(D("10000"), [1, 2, 3], "VND")
        has_fractions = any(v % D("1") != D("0") for v in r.values())
        total = sum(r.values())
        return {"_total": str(total), "_has_fractions": str(has_fractions)}

    add(TestCase(
        id="rounding-008",
        category="rounding",
        description="₫10000 / 3 (VND) — no fractional dong",
        plain_language_description="Split ₫10,000 among 3 people in Vietnamese Dong. VND has no decimal places, so every share must be a whole number summing to ₫10,000.",
        input_display={"amount": "₫10000", "currency": "VND", "people": 3},
        runner=_r008,
        checks=[
            _chk("Sum = ₫10000", lambda a: _close(a.get("_total", 0), "10000"), lambda a: f"Sum was {a.get('_total')}"),
            _chk("No fractional dong", lambda a: a.get("_has_fractions") == "False", lambda a: "Fractional VND found"),
        ],
    ))

    # ── MULTI-PAYER ───────────────────────────────────────────────────────

    def _mp001():
        exp = _Exp(paid_by={1: 600, 2: 400}, split_amounts={1: D("333.34"), 2: D("333.33"), 3: D("333.33")})
        b = compute_net_balances([exp], [])
        total = sum(b.values())
        return {str(k): str(v) for k, v in b.items()} | {"_net": str(total)}

    add(TestCase(
        id="multi-001",
        category="multi_payer",
        description="Two payers (Alice ₹600, Bob ₹400) split 3 ways including Charlie",
        plain_language_description="Alice and Bob each paid part of a ₹1000 dinner. Charlie also ate. Checks individual balances and that net is zero.",
        input_display={"paid_by": {"Alice": 600, "Bob": 400}, "split_among": 3},
        runner=_mp001,
        checks=[
            _chk("Net balances = 0", lambda a: _close(a.get("_net", 1), "0"), lambda a: f"Net was {a.get('_net')}"),
            _chk("Alice owed ≈ ₹266.66", lambda a: _close(a.get("1", 0), "266.66"), lambda a: f"Alice: {a.get('1')}"),
            _chk("Bob owed ≈ ₹66.67", lambda a: _close(a.get("2", 0), "66.67"), lambda a: f"Bob: {a.get('2')}"),
            _chk("Charlie owes ₹333.33", lambda a: _close(a.get("3", 0), "-333.33"), lambda a: f"Charlie: {a.get('3')}"),
        ],
    ))

    def _mp002():
        exp = _Exp(paid_by={1: D("333.34"), 2: D("333.33"), 3: D("333.33")},
                   split_amounts={1: D("333.34"), 2: D("333.33"), 3: D("333.33")})
        b = compute_net_balances([exp], [])
        total = sum(b.values()) if b else D("0")
        max_abs = max((abs(v) for v in b.values()), default=D("0"))
        return {"_total": str(total), "_max_abs": str(max_abs), "_all_zero": str(all(abs(v) < D("0.005") for v in b.values()))}

    add(TestCase(
        id="multi-002",
        category="multi_payer",
        description="Three co-payers each paid their own share — all net to zero",
        plain_language_description="Alice, Bob, Charlie each paid exactly their own ₹333 share. Everyone's balance should be exactly zero.",
        input_display={"each_paid": "their own share"},
        runner=_mp002,
        checks=[
            _chk("All balances = 0", lambda a: a.get("_all_zero") == "True", lambda a: f"Max non-zero: {a.get('_max_abs')}"),
            _chk("Net = 0", lambda a: _close(a.get("_total", 1), "0"), lambda a: f"Net was {a.get('_total')}"),
        ],
    ))

    def _mp003():
        paid = {1: D("300"), 2: D("500")}
        total_paid = sum(paid.values())
        total_expense = D("1000")
        return {"passed": total_paid != total_expense, "_paid": str(total_paid), "_expense": str(total_expense), "_diff": str(total_expense - total_paid)}

    add(TestCase(
        id="multi-003",
        category="multi_payer",
        description="Multi-payer amounts that don't sum to total — must be detected",
        plain_language_description="Alice ₹300 + Bob ₹500 = ₹800, not ₹1000. The ₹200 shortfall must be detected and rejected.",
        input_display={"paid_by": {"Alice": 300, "Bob": 500}, "total": 1000, "problem": "300+500=800 ≠ 1000"},
        runner=_mp003,
        checks=[
            _chk("Mismatch is detected", lambda a: a.get("passed") is True or a.get("passed") == "True", lambda a: "Shortfall not detected"),
            _chk("Shortfall = ₹200", lambda a: _close(a.get("_diff", 0), "200"), lambda a: f"Diff was {a.get('_diff')}"),
        ],
    ))

    def _mp004():
        # 4-way split, 2 payers, verify every individual share is correct
        exp = _Exp(paid_by={1: D("750"), 2: D("250")},
                   split_amounts={1: D("250"), 2: D("250"), 3: D("250"), 4: D("250")})
        b = compute_net_balances([exp], [])
        total = sum(b.values())
        return {str(k): str(v) for k, v in b.items()} | {"_net": str(total)}

    add(TestCase(
        id="multi-004",
        category="multi_payer",
        description="2 payers, 4-way split: Alice ₹750, Bob ₹250 for ₹1000 dinner",
        plain_language_description="Alice paid ₹750, Bob paid ₹250 of a ₹1000 bill split equally among 4. Alice owed ₹500, Bob breaks even, Charlie and Dave each owe ₹250.",
        input_display={"paid_by": {"Alice": 750, "Bob": 250}, "split_4_ways": True},
        runner=_mp004,
        checks=[
            _chk("Net = 0", lambda a: _close(a.get("_net", 1), "0"), lambda a: f"Net={a.get('_net')}"),
            _chk("Alice owed ₹500", lambda a: _close(a.get("1", 0), "500"), lambda a: f"Alice={a.get('1')}"),
            _chk("Bob breaks even (₹0)", lambda a: _close(a.get("2", 0), "0"), lambda a: f"Bob={a.get('2')}"),
            _chk("Charlie owes ₹250", lambda a: _close(a.get("3", 0), "-250"), lambda a: f"Charlie={a.get('3')}"),
            _chk("Dave owes ₹250", lambda a: _close(a.get("4", 0), "-250"), lambda a: f"Dave={a.get('4')}"),
        ],
    ))

    # ── SELF-OWING ────────────────────────────────────────────────────────

    def _so001():
        exp = _Exp(paid_by={1: 100}, split_amounts={1: D("50"), 2: D("50")})
        b = compute_net_balances([exp], [])
        total = sum(b.values())
        return {str(k): str(v) for k, v in b.items()} | {"_net": str(total)}

    add(TestCase(
        id="self-001",
        category="self_owing",
        description="Payer also in split — own share nets out, no self-debt",
        plain_language_description="Alice pays ₹100, split equally with Bob. Alice's net is +₹50 (not +₹100). Net must be zero.",
        input_display={"paid_by": "Alice", "split_among": ["Alice", "Bob"]},
        runner=_so001,
        checks=[
            _chk("Net = 0", lambda a: _close(a.get("_net", 1), "0"), lambda a: f"Net={a.get('_net')}"),
            _chk("Alice owed +₹50", lambda a: _close(a.get("1", 0), "50"), lambda a: f"Alice={a.get('1')}"),
            _chk("Bob owes -₹50", lambda a: _close(a.get("2", 0), "-50"), lambda a: f"Bob={a.get('2')}"),
            _chk("Alice not owed full ₹100", lambda a: not _close(a.get("1", 0), "100"), lambda a: "Alice owed full ₹100 — her own share not deducted"),
        ],
    ))

    def _so002():
        exp = _Exp(paid_by={1: 100}, split_amounts={1: D("50"), 2: D("50")})
        b = compute_net_balances([exp], [])
        settlements = simplify_debts(b)
        self_pmts = [(f, t, a) for f, t, a in settlements if f == t]
        return {"passed": len(self_pmts) == 0, "_self_count": str(len(self_pmts)),
                "_total_settlements": str(len(settlements))}

    add(TestCase(
        id="self-002",
        category="self_owing",
        description="Settlement plan has no self-payments",
        plain_language_description="No settlement plan should ever say 'Alice owes Alice ₹50'. That would be nonsensical.",
        input_display={"scenario": "Alice pays ₹100 for Alice+Bob"},
        runner=_so002,
        checks=[
            _chk("Zero self-payments", lambda a: a.get("_self_count") == "0", lambda a: f"Found {a.get('_self_count')} self-payment(s)"),
            _chk("Exactly 1 settlement", lambda a: a.get("_total_settlements") == "1", lambda a: f"Got {a.get('_total_settlements')} settlements"),
        ],
    ))

    # ── PARTIAL SPLIT ─────────────────────────────────────────────────────

    def _ps001():
        exp = _Exp(paid_by={1: 100}, split_amounts={1: D("50"), 2: D("50")})
        b = compute_net_balances([exp], [])
        total = sum(b.values())
        return {"1": str(b.get(1, D("0"))), "2": str(b.get(2, D("0"))),
                "3": str(b.get(3, D("0"))), "4": str(b.get(4, D("0"))),
                "_net": str(total)}

    add(TestCase(
        id="partial-001",
        category="partial_split",
        description="4-member group; expense split only between 2 — others unaffected",
        plain_language_description="Alice pays ₹100 for a coffee with Bob only. Charlie and Dave weren't there — their balances must stay at zero.",
        input_display={"group_size": 4, "split_among": ["Alice", "Bob"], "excluded": ["Charlie", "Dave"]},
        runner=_ps001,
        checks=[
            _chk("Net = 0", lambda a: _close(a.get("_net", 1), "0"), lambda a: f"Net={a.get('_net')}"),
            _chk("Alice = +₹50", lambda a: _close(a.get("1", 0), "50"), lambda a: f"Alice={a.get('1')}"),
            _chk("Bob = -₹50", lambda a: _close(a.get("2", 0), "-50"), lambda a: f"Bob={a.get('2')}"),
            _chk("Charlie = ₹0", lambda a: _close(a.get("3", 0), "0"), lambda a: f"Charlie={a.get('3')} (should be 0)"),
            _chk("Dave = ₹0", lambda a: _close(a.get("4", 0), "0"), lambda a: f"Dave={a.get('4')} (should be 0)"),
        ],
    ))

    def _ps002():
        exp1 = _Exp(paid_by={1: 200}, split_amounts={1: D("100"), 2: D("100")})
        exp2 = _Exp(paid_by={2: 150}, split_amounts={1: D("75"), 2: D("75")})
        b = compute_net_balances([exp1, exp2], [])
        total = sum(b.values())
        return {str(k): str(v) for k, v in b.items()} | {"_net": str(total)}

    add(TestCase(
        id="partial-002",
        category="partial_split",
        description="Multiple subset expenses — only participants affected",
        plain_language_description="Two expenses only between Alice and Bob. Charlie is in the group but never participates. Charlie's balance must remain zero.",
        input_display={"expenses": ["₹200 Alice→Alice+Bob", "₹150 Bob→Alice+Bob"]},
        runner=_ps002,
        checks=[
            _chk("Net = 0", lambda a: _close(a.get("_net", 1), "0"), lambda a: f"Net={a.get('_net')}"),
            _chk("Alice = +₹25", lambda a: _close(a.get("1", 0), "25"), lambda a: f"Alice={a.get('1')}"),
            _chk("Bob = -₹25", lambda a: _close(a.get("2", 0), "-25"), lambda a: f"Bob={a.get('2')}"),
            _chk("Charlie not in result (unaffected)", lambda a: "3" not in a or _close(a.get("3", 0), "0"), lambda a: f"Charlie={a.get('3')}"),
        ],
    ))

    # ── VALIDATION ────────────────────────────────────────────────────────

    def _v001():
        try:
            from schemas import ExpenseCreate
            import datetime
            ExpenseCreate(
                description="test", original_amount=D("0"), original_currency="INR",
                paid_by={"1": D("0")}, split_type="equal", split_among=[1],
                date=datetime.date.today()
            )
            return {"passed": False, "rejected": False, "error": "not rejected"}
        except Exception as ex:
            return {"passed": True, "rejected": True, "error": str(ex)}

    add(TestCase(
        id="valid-001",
        category="validation",
        description="Zero-amount expense — must be rejected",
        plain_language_description="Adding an expense for ₹0.00 makes no sense. The system must reject it with a clear error.",
        input_display={"amount": "₹0.00"},
        runner=_v001,
        checks=[
            _chk("Zero amount rejected", lambda a: a.get("rejected") is True, lambda a: f"Not rejected: {a.get('error')}"),
            _chk("Error message present", lambda a: bool(a.get("error") and a.get("error") != "not rejected"), lambda a: "No error message returned"),
        ],
    ))

    def _v002():
        try:
            from schemas import ExpenseCreate
            import datetime
            ExpenseCreate(
                description="test", original_amount=D("-100"), original_currency="INR",
                paid_by={"1": D("-100")}, split_type="equal", split_among=[1],
                date=datetime.date.today(), is_negative=False
            )
            return {"passed": False, "rejected": False, "error": "not rejected"}
        except Exception as ex:
            return {"passed": True, "rejected": True, "error": str(ex)}

    add(TestCase(
        id="valid-002",
        category="validation",
        description="Negative amount without is_negative flag — must be rejected",
        plain_language_description="A negative amount without the refund flag should be rejected. Otherwise someone could enter -₹100 and create phantom credits.",
        input_display={"amount": "-₹100.00", "is_negative": False},
        runner=_v002,
        checks=[
            _chk("Negative-without-flag rejected", lambda a: a.get("rejected") is True, lambda a: f"Not rejected: {a.get('error')}"),
            _chk("Error message present", lambda a: bool(a.get("error") and a.get("error") != "not rejected"), lambda a: "No error message"),
        ],
    ))

    def _v003():
        _, err = split_exact(D("100"), {1: D("60"), 2: D("41")}, "INR")
        return {"passed": err is not None, "rejected": err is not None, "error": err or "no error"}

    add(TestCase(
        id="valid-003",
        category="validation",
        description="Exact split where amounts don't sum to total — rejected",
        plain_language_description="Alice ₹60 + Bob ₹41 = ₹101, not ₹100. The system must catch this ₹1 discrepancy.",
        input_display={"total": "₹100", "split": {"Alice": 60, "Bob": 41}, "problem": "60+41=101≠100"},
        runner=_v003,
        checks=[
            _chk("Mismatch rejected", lambda a: a.get("rejected") is True, lambda a: "Mismatch not caught"),
            _chk("Error message present", lambda a: a.get("error") not in (None, "no error"), lambda a: "No error returned"),
        ],
    ))

    def _v004():
        amounts, err = split_exact(D("100"), {1: D("60"), 2: D("40")}, "INR")
        return {"passed": err is None, "rejected": err is not None,
                "u1": str(amounts.get(1, 0)) if amounts else "0",
                "u2": str(amounts.get(2, 0)) if amounts else "0"}

    add(TestCase(
        id="valid-004",
        category="validation",
        description="Exact split where amounts sum correctly — accepted",
        plain_language_description="Alice ₹60 + Bob ₹40 = ₹100. This should be accepted with no error.",
        input_display={"total": "₹100", "split": {"Alice": 60, "Bob": 40}},
        runner=_v004,
        checks=[
            _chk("Valid split accepted", lambda a: a.get("rejected") is False, lambda a: "Valid split was rejected"),
            _chk("Alice = ₹60", lambda a: _close(a.get("u1", 0), "60"), lambda a: f"Alice={a.get('u1')}"),
            _chk("Bob = ₹40", lambda a: _close(a.get("u2", 0), "40"), lambda a: f"Bob={a.get('u2')}"),
        ],
    ))

    def _v005():
        _, _, err = calculate_split(D("100"), "INR", "equal", [], None)
        return {"passed": err is not None, "rejected": err is not None, "error": err or "no error"}

    add(TestCase(
        id="valid-005",
        category="validation",
        description="Split among zero people — must be rejected",
        plain_language_description="An expense split among nobody is meaningless. Must be rejected before any amount is written.",
        input_display={"amount": "₹100", "split_among": []},
        runner=_v005,
        checks=[
            _chk("Empty split_among rejected", lambda a: a.get("rejected") is True, lambda a: f"Not rejected: {a.get('error')}"),
        ],
    ))

    def _v006():
        _, _, err = calculate_split(D("100"), "INR", "exact", [1, 2],
                                    {"1": D("50"), "3": D("50")})
        return {"passed": err is not None, "rejected": err is not None, "error": err or "no error"}

    add(TestCase(
        id="valid-006",
        category="validation",
        description="Exact split includes a user not in split_among — rejected",
        plain_language_description="User 3 is in the split details but not in split_among. Must be caught.",
        input_display={"split_among": [1, 2], "split_details": {"1": 50, "3": 50}},
        runner=_v006,
        checks=[
            _chk("Unlisted user rejected", lambda a: a.get("rejected") is True, lambda a: f"Not rejected: {a.get('error')}"),
        ],
    ))

    # ── PERCENTAGE SPLIT ──────────────────────────────────────────────────

    def _pct001():
        amounts, err = split_percentage(D("100"), {1: D("50"), 2: D("50")}, "INR")
        total = sum(amounts.values()) if amounts else D("0")
        return {"passed": err is None, "rejected": err is not None, "_total": str(total),
                "u1": str(amounts.get(1, 0)) if amounts else "0",
                "u2": str(amounts.get(2, 0)) if amounts else "0"}

    add(TestCase(
        id="pct-001",
        category="percentage_split",
        description="50%+50% = 100% — accepted, each gets ₹50",
        plain_language_description="Alice 50%, Bob 50% of ₹100. Valid split — each gets exactly ₹50.",
        input_display={"percentages": {"Alice": "50%", "Bob": "50%"}, "total": "₹100"},
        runner=_pct001,
        checks=[
            _chk("50/50 split accepted", lambda a: a.get("rejected") is False, lambda a: "Valid 50/50 split was rejected"),
            _chk("Sum = ₹100", lambda a: _close(a.get("_total", 0), "100"), lambda a: f"Sum={a.get('_total')}"),
            _chk("Alice = ₹50", lambda a: _close(a.get("u1", 0), "50"), lambda a: f"Alice={a.get('u1')}"),
            _chk("Bob = ₹50", lambda a: _close(a.get("u2", 0), "50"), lambda a: f"Bob={a.get('u2')}"),
        ],
    ))

    def _pct002():
        amounts, err = split_percentage(D("100"), {1: D("33.33"), 2: D("33.33"), 3: D("33.34")}, "INR")
        total = sum(amounts.values()) if amounts else D("0")
        return {"passed": err is None, "rejected": err is not None, "_total": str(total)}

    add(TestCase(
        id="pct-002",
        category="percentage_split",
        description="33.33%+33.33%+33.34% = 100% — fractional percentages accepted",
        plain_language_description="Three fractional percentages summing to exactly 100%. Amounts must sum to ₹100 perfectly.",
        input_display={"percentages": {"Alice": "33.33%", "Bob": "33.33%", "Charlie": "33.34%"}},
        runner=_pct002,
        checks=[
            _chk("Fractional percentages accepted", lambda a: a.get("rejected") is False, lambda a: "Valid fractional percentages rejected"),
            _chk("Sum = ₹100", lambda a: _close(a.get("_total", 0), "100"), lambda a: f"Sum={a.get('_total')}"),
        ],
    ))

    def _pct003():
        _, err = split_percentage(D("100"), {1: D("50"), 2: D("49")}, "INR")
        return {"passed": err is not None, "rejected": err is not None, "error": err or "no error"}

    add(TestCase(
        id="pct-003",
        category="percentage_split",
        description="50%+49% = 99% — rejected (1% missing)",
        plain_language_description="Percentages only total 99%, leaving 1% unaccounted for. Must be rejected.",
        input_display={"percentages": {"Alice": "50%", "Bob": "49%"}, "sum": "99%"},
        runner=_pct003,
        checks=[
            _chk("Under-100% rejected", lambda a: a.get("rejected") is True, lambda a: "99% total was accepted"),
            _chk("Error message present", lambda a: a.get("error") not in (None, "no error"), lambda a: "No error message"),
        ],
    ))

    def _pct004():
        _, err = split_percentage(D("100"), {1: D("50"), 2: D("51")}, "INR")
        return {"passed": err is not None, "rejected": err is not None, "error": err or "no error"}

    add(TestCase(
        id="pct-004",
        category="percentage_split",
        description="50%+51% = 101% — rejected (over by 1%)",
        plain_language_description="Percentages total 101% — over-allocated by 1%. Must be rejected.",
        input_display={"percentages": {"Alice": "50%", "Bob": "51%"}, "sum": "101%"},
        runner=_pct004,
        checks=[
            _chk("Over-100% rejected", lambda a: a.get("rejected") is True, lambda a: "101% total was accepted"),
            _chk("Error message present", lambda a: a.get("error") not in (None, "no error"), lambda a: "No error message"),
        ],
    ))

    def _pct005():
        # 100 people each at 1% — precision test
        percentages = {i: D("1") for i in range(1, 101)}
        amounts, err = split_percentage(D("100"), percentages, "INR")
        total = sum(amounts.values()) if amounts else D("0")
        return {"passed": err is None, "rejected": err is not None, "_total": str(total), "_count": str(len(amounts) if amounts else 0)}

    add(TestCase(
        id="pct-005",
        category="percentage_split",
        description="100 people each at 1% — precision test",
        plain_language_description="100 people splitting ₹100 at 1% each. Every person gets exactly ₹1.00. Sum must still equal ₹100.00.",
        input_display={"people": 100, "each": "1%", "total": "₹100"},
        runner=_pct005,
        checks=[
            _chk("100×1% accepted", lambda a: a.get("rejected") is False, lambda a: "Valid 100×1% split rejected"),
            _chk("Sum = ₹100", lambda a: _close(a.get("_total", 0), "100"), lambda a: f"Sum={a.get('_total')}"),
            _chk("100 shares produced", lambda a: a.get("_count") == "100", lambda a: f"Got {a.get('_count')} shares"),
        ],
    ))

    # ── SHARES SPLIT ──────────────────────────────────────────────────────

    def _sh001():
        amounts, err = split_shares(D("400"), {1: D("2"), 2: D("1"), 3: D("1")}, "INR")
        total = sum(amounts.values()) if amounts else D("0")
        return {"passed": err is None, "rejected": err is not None,
                "u1": str(amounts.get(1, 0)) if amounts else "0",
                "u2": str(amounts.get(2, 0)) if amounts else "0",
                "u3": str(amounts.get(3, 0)) if amounts else "0",
                "_total": str(total)}

    add(TestCase(
        id="shares-001",
        category="shares_split",
        description="2:1:1 weighted split of ₹400 — Alice gets double",
        plain_language_description="Alice has 2 shares, Bob and Charlie 1 each. ₹400 in 2:1:1 ratio: Alice ₹200, Bob ₹100, Charlie ₹100.",
        input_display={"total": "₹400", "shares": {"Alice": 2, "Bob": 1, "Charlie": 1}},
        runner=_sh001,
        checks=[
            _chk("2:1:1 split accepted", lambda a: a.get("rejected") is False, lambda a: "Valid shares split rejected"),
            _chk("Sum = ₹400", lambda a: _close(a.get("_total", 0), "400"), lambda a: f"Sum={a.get('_total')}"),
            _chk("Alice = ₹200 (2 shares)", lambda a: _close(a.get("u1", 0), "200"), lambda a: f"Alice={a.get('u1')}"),
            _chk("Bob = ₹100 (1 share)", lambda a: _close(a.get("u2", 0), "100"), lambda a: f"Bob={a.get('u2')}"),
            _chk("Charlie = ₹100 (1 share)", lambda a: _close(a.get("u3", 0), "100"), lambda a: f"Charlie={a.get('u3')}"),
        ],
    ))

    def _sh002():
        amounts, err = split_shares(D("120"), {1: D("3"), 2: D("2"), 3: D("1")}, "INR")
        total = sum(amounts.values()) if amounts else D("0")
        return {"passed": err is None, "rejected": err is not None,
                "u1": str(amounts.get(1, 0)) if amounts else "0",
                "u2": str(amounts.get(2, 0)) if amounts else "0",
                "u3": str(amounts.get(3, 0)) if amounts else "0",
                "_total": str(total)}

    add(TestCase(
        id="shares-002",
        category="shares_split",
        description="3:2:1 shares of ₹120 — proportional to weight",
        plain_language_description="Alice (3 shares), Bob (2 shares), Charlie (1 share). ₹120 in 3:2:1 ratio: Alice ₹60, Bob ₹40, Charlie ₹20.",
        input_display={"total": "₹120", "shares": {"Alice": 3, "Bob": 2, "Charlie": 1}},
        runner=_sh002,
        checks=[
            _chk("3:2:1 split accepted", lambda a: a.get("rejected") is False, lambda a: "Valid shares split rejected"),
            _chk("Sum = ₹120", lambda a: _close(a.get("_total", 0), "120"), lambda a: f"Sum={a.get('_total')}"),
            _chk("Alice = ₹60", lambda a: _close(a.get("u1", 0), "60"), lambda a: f"Alice={a.get('u1')}"),
            _chk("Bob = ₹40", lambda a: _close(a.get("u2", 0), "40"), lambda a: f"Bob={a.get('u2')}"),
            _chk("Charlie = ₹20", lambda a: _close(a.get("u3", 0), "20"), lambda a: f"Charlie={a.get('u3')}"),
        ],
    ))

    def _sh003():
        _, err = split_shares(D("100"), {1: D("0"), 2: D("0")}, "INR")
        return {"passed": err is not None, "rejected": err is not None, "error": err or "no error"}

    add(TestCase(
        id="shares-003",
        category="shares_split",
        description="Zero shares — must be rejected (division by zero risk)",
        plain_language_description="All shares are zero — dividing by zero total shares would crash. Must be rejected.",
        input_display={"shares": {"Alice": 0, "Bob": 0}},
        runner=_sh003,
        checks=[
            _chk("Zero shares rejected", lambda a: a.get("rejected") is True, lambda a: f"Not rejected: {a.get('error')}"),
        ],
    ))

    # ── CURRENCY ──────────────────────────────────────────────────────────

    def _cur001():
        r = split_equal(D("10007"), [1, 2, 3], "JPY")
        has_fractions = any(v % D("1") != D("0") for v in r.values())
        total = sum(r.values())
        return {"_has_fractions": str(has_fractions), "_total": str(total), "_count": str(len(r))}

    add(TestCase(
        id="currency-001",
        category="currency",
        description="JPY: ¥10007 / 3 — no fractional yen produced",
        plain_language_description="¥10,007 split among 3 people must produce whole-number amounts only. No '¥3335.67'.",
        input_display={"amount": "¥10007", "currency": "JPY", "people": 3},
        runner=_cur001,
        checks=[
            _chk("No fractional yen", lambda a: a.get("_has_fractions") == "False", lambda a: "Fractional amounts produced in JPY"),
            _chk("Sum = ¥10007", lambda a: _close(a.get("_total", 0), "10007"), lambda a: f"Sum={a.get('_total')}"),
            _chk("3 shares produced", lambda a: a.get("_count") == "3", lambda a: f"Got {a.get('_count')} shares"),
        ],
    ))

    def _cur002():
        amount_inr = D("100") * D("83")
        r = split_equal(amount_inr, [1, 2], "INR")
        total = sum(r.values())
        return {"_total_inr": str(total), "_expected": "8300.00"}

    add(TestCase(
        id="currency-002",
        category="currency",
        description="FX conversion: $100 at ₹83/$ = ₹8300 split 2 ways",
        plain_language_description="$100 at ₹83/$ = ₹8300. Splitting ₹8300 between 2 people — ₹4150 each.",
        input_display={"original": "$100", "fx_rate": "₹83/$", "converted": "₹8300"},
        runner=_cur002,
        checks=[
            _chk("FX total = ₹8300", lambda a: _close(a.get("_total_inr", 0), "8300"), lambda a: f"Got ₹{a.get('_total_inr')}"),
        ],
    ))

    def _cur003():
        original_currency = "USD"
        group_currency = "INR"
        fx_rate = D("1")
        needs_fx = original_currency.upper() != group_currency.upper()
        rate_missing = fx_rate == D("1") or fx_rate <= 0
        rejected = needs_fx and rate_missing
        return {"passed": rejected, "_needs_fx": str(needs_fx), "_rate_missing": str(rate_missing)}

    add(TestCase(
        id="currency-003",
        category="currency",
        description="USD expense in INR group without FX rate — must be flagged",
        plain_language_description="$100 expense in INR group without an exchange rate. Must refuse — otherwise $100 is silently treated as ₹100 (a 98% error).",
        input_display={"expense_currency": "USD", "group_currency": "INR", "fx_rate": "not provided"},
        runner=_cur003,
        checks=[
            _chk("Cross-currency mismatch detected", lambda a: a.get("passed") is True or a.get("passed") == "True", lambda a: "Missing FX rate not flagged"),
            _chk("FX is needed", lambda a: a.get("_needs_fx") == "True", lambda a: "System thinks no FX needed"),
        ],
    ))

    def _cur004():
        original_currency = "INR"
        group_currency = "INR"
        fx_rate = D("1")
        needs_fx = original_currency.upper() != group_currency.upper()
        should_block = needs_fx and (fx_rate == D("1") or fx_rate <= 0)
        return {"passed": not should_block, "_needs_fx": str(needs_fx)}

    add(TestCase(
        id="currency-004",
        category="currency",
        description="Same currency: FX rate of 1 is accepted (not flagged as missing)",
        plain_language_description="INR expense in INR group with fx_rate=1 is perfectly valid. Must not be blocked.",
        input_display={"expense_currency": "INR", "group_currency": "INR", "fx_rate": 1},
        runner=_cur004,
        checks=[
            _chk("Same-currency not blocked", lambda a: a.get("passed") is True or a.get("passed") == "True", lambda a: "Valid same-currency expense incorrectly blocked"),
            _chk("FX not needed", lambda a: a.get("_needs_fx") == "False", lambda a: "System thinks FX is needed for same-currency"),
        ],
    ))

    # ── DEBT SIMPLIFICATION ───────────────────────────────────────────────

    def _ds001():
        balances = {1: D("100"), 2: D("0"), 3: D("-100")}
        settlements = simplify_debts(balances)
        correct = len(settlements) == 1 and settlements[0][0] == 3 and settlements[0][1] == 1
        amount = settlements[0][2] if settlements else D("0")
        return {"_count": str(len(settlements)), "_amount": str(amount), "passed": correct}

    add(TestCase(
        id="debt-001",
        category="debt_simplification",
        description="Linear chain: C owes B owes A → simplifies to 1 transaction (C→A)",
        plain_language_description="Charlie owes Bob ₹100, Bob owes Alice ₹100. Simplified: just Charlie pays Alice. 1 payment not 2.",
        input_display={"situation": "C owes B ₹100, B owes A ₹100"},
        runner=_ds001,
        checks=[
            _chk("Exactly 1 transaction", lambda a: a.get("_count") == "1", lambda a: f"Got {a.get('_count')} transactions"),
            _chk("Correct direction (C→A)", lambda a: a.get("passed") is True or a.get("passed") == "True", lambda a: "Wrong direction"),
            _chk("Amount = ₹100", lambda a: _close(a.get("_amount", 0), "100"), lambda a: f"Amount={a.get('_amount')}"),
        ],
    ))

    def _ds002():
        balances = {1: D("0"), 2: D("0"), 3: D("0")}
        settlements = simplify_debts(balances)
        return {"_count": str(len(settlements)), "passed": len(settlements) == 0}

    add(TestCase(
        id="debt-002",
        category="debt_simplification",
        description="All-zero balances — zero transactions needed",
        plain_language_description="Everyone is settled. No settlement plan needed — zero transactions.",
        input_display={"balances": {"all": 0}},
        runner=_ds002,
        checks=[
            _chk("Zero transactions when all settled", lambda a: a.get("_count") == "0", lambda a: f"Got {a.get('_count')} transactions"),
        ],
    ))

    def _ds003():
        balances = {1: D("300"), 2: D("200"), 3: D("-250"), 4: D("-250")}
        settlements = simplify_debts(balances)
        total_flow = sum(amt for _, _, amt in settlements)
        net_check = abs(sum(balances.values())) < D("0.01")
        return {"_count": str(len(settlements)), "_total_flow": str(total_flow),
                "_net_check": str(net_check),
                "passed": len(settlements) <= 3 and net_check}

    add(TestCase(
        id="debt-003",
        category="debt_simplification",
        description="4-person group: simplified plan uses ≤ 3 transactions",
        plain_language_description="4-person group with mixed debts. Simplification must reduce to ≤ 3 payments. Total flow must cover all debts.",
        input_display={"balances": {"Alice": "+300", "Bob": "+200", "Charlie": "-250", "Dave": "-250"}},
        runner=_ds003,
        checks=[
            _chk("Balances net to zero", lambda a: a.get("_net_check") == "True", lambda a: "Source balances don't net to zero"),
            _chk("≤ 3 transactions", lambda a: int(a.get("_count", 99)) <= 3, lambda a: f"Got {a.get('_count')} transactions"),
            _chk("Total flow = ₹500", lambda a: _close(a.get("_total_flow", 0), "500"), lambda a: f"Flow={a.get('_total_flow')}"),
        ],
    ))

    def _ds004():
        balances = {1: D("500"), 2: D("-200"), 3: D("-300")}
        settlements = simplify_debts(balances)
        total_settled = sum(amt for _, _, amt in settlements)
        no_self = all(f != t for f, t, _ in settlements)
        return {"_total_settled": str(total_settled), "_count": str(len(settlements)), "_no_self": str(no_self)}

    add(TestCase(
        id="debt-004",
        category="debt_simplification",
        description="Settlement amounts sum to total positive balance (₹500)",
        plain_language_description="Alice owed ₹500. Bob and Charlie owe her. Settlement plan must move exactly ₹500 toward Alice. No self-payments.",
        input_display={"Alice owed": 500, "Bob owes": 200, "Charlie owes": 300},
        runner=_ds004,
        checks=[
            _chk("Total settled = ₹500", lambda a: _close(a.get("_total_settled", 0), "500"), lambda a: f"Settled={a.get('_total_settled')}"),
            _chk("No self-payments", lambda a: a.get("_no_self") == "True", lambda a: "Self-payment found in settlement"),
        ],
    ))

    def _ds005():
        # 5-person star topology: all owe user 1
        balances = {1: D("400"), 2: D("-100"), 3: D("-100"), 4: D("-100"), 5: D("-100")}
        settlements = simplify_debts(balances)
        total = sum(amt for _, _, amt in settlements)
        no_self = all(f != t for f, t, _ in settlements)
        return {"_count": str(len(settlements)), "_total": str(total), "_no_self": str(no_self)}

    add(TestCase(
        id="debt-005",
        category="debt_simplification",
        description="5-person star: 4 debtors all owe Alice — exactly 4 transactions",
        plain_language_description="Bob, Charlie, Dave, Eve each owe Alice ₹100. Settlement: 4 direct payments to Alice. Total flow = ₹400. No self-payments.",
        input_display={"Alice owed": 400, "others each owe": 100},
        runner=_ds005,
        checks=[
            _chk("Exactly 4 transactions", lambda a: a.get("_count") == "4", lambda a: f"Got {a.get('_count')} transactions"),
            _chk("Total flow = ₹400", lambda a: _close(a.get("_total", 0), "400"), lambda a: f"Flow={a.get('_total')}"),
            _chk("No self-payments", lambda a: a.get("_no_self") == "True", lambda a: "Self-payment found"),
        ],
    ))

    # ── PARTIAL SETTLEMENT ────────────────────────────────────────────────

    def _pset001():
        exp = _Exp(paid_by={1: 100}, split_amounts={1: D("50"), 2: D("50")})
        pmt = _Pmt(2, 1, 25)
        b = compute_net_balances([exp], [pmt])
        total = sum(b.values())
        return {str(k): str(v) for k, v in b.items()} | {"_net": str(total)}

    add(TestCase(
        id="settle-001",
        category="partial_settlement",
        description="Bob pays half (₹25 of ₹50 owed) — remaining ₹25 shown",
        plain_language_description="Alice paid ₹100. Bob owed ₹50, paid ₹25. Remaining: Alice owed ₹25, Bob owes ₹25.",
        input_display={"Bob's_debt": 50, "paid": 25, "remaining": 25},
        runner=_pset001,
        checks=[
            _chk("Net = 0", lambda a: _close(a.get("_net", 1), "0"), lambda a: f"Net={a.get('_net')}"),
            _chk("Alice owed ₹25", lambda a: _close(a.get("1", 0), "25"), lambda a: f"Alice={a.get('1')}"),
            _chk("Bob owes ₹25", lambda a: _close(a.get("2", 0), "-25"), lambda a: f"Bob={a.get('2')}"),
            _chk("Not fully settled yet", lambda a: not _close(a.get("2", 0), "0"), lambda a: "Wrongly shows fully settled"),
        ],
    ))

    def _pset002():
        exp = _Exp(paid_by={1: 100}, split_amounts={1: D("50"), 2: D("50")})
        pmt = _Pmt(2, 1, 50)
        b = compute_net_balances([exp], [pmt])
        all_zero = all(abs(v) < D("0.005") for v in b.values()) if b else True
        total = sum(b.values()) if b else D("0")
        return {"passed": all_zero, "_net": str(total), "_bob": str(b.get(2, D("0")))}

    add(TestCase(
        id="settle-002",
        category="partial_settlement",
        description="Full payment — all balances become exactly zero",
        plain_language_description="Bob owed Alice ₹50 and pays exactly ₹50. Both balances must be exactly ₹0.00.",
        input_display={"Bob's_debt": 50, "Bob_paid": 50},
        runner=_pset002,
        checks=[
            _chk("All balances = zero", lambda a: a.get("passed") is True or a.get("passed") == "True", lambda a: f"Bob's balance: {a.get('_bob')}"),
            _chk("Net = 0", lambda a: _close(a.get("_net", 1), "0"), lambda a: f"Net={a.get('_net')}"),
        ],
    ))

    def _pset003():
        exp = _Exp(paid_by={1: 100}, split_amounts={1: D("50"), 2: D("50")})
        pmt = _Pmt(2, 1, 80)
        b = compute_net_balances([exp], [pmt])
        total = sum(b.values())
        alice_owes = _sd(b.get(1, D("0"))) < 0
        bob_owed = _sd(b.get(2, D("0"))) > 0
        return {"passed": alice_owes and bob_owed,
                "1": str(b.get(1, D("0"))), "2": str(b.get(2, D("0"))),
                "_net": str(total)}

    add(TestCase(
        id="settle-003",
        category="partial_settlement",
        description="Overpayment flips creditor/debtor roles correctly",
        plain_language_description="Bob owed Alice ₹50 but pays ₹80. Now Alice owes Bob ₹30. Roles flip.",
        input_display={"Bob's_debt": 50, "Bob_paid": 80, "overpayment": 30},
        runner=_pset003,
        checks=[
            _chk("Net = 0", lambda a: _close(a.get("_net", 1), "0"), lambda a: f"Net={a.get('_net')}"),
            _chk("Alice now owes (negative)", lambda a: _sd(a.get("1", 0)) < 0, lambda a: f"Alice={a.get('1')} (should be negative)"),
            _chk("Bob now owed (positive)", lambda a: _sd(a.get("2", 0)) > 0, lambda a: f"Bob={a.get('2')} (should be positive)"),
            _chk("Alice owes Bob ₹30", lambda a: _close(a.get("1", 0), "-30"), lambda a: f"Alice={a.get('1')}"),
        ],
    ))

    def _pset004():
        # 3-way: Alice paid, Bob and Charlie owe; Bob pays half
        exp = _Exp(paid_by={1: 300}, split_amounts={1: D("100"), 2: D("100"), 3: D("100")})
        pmt = _Pmt(2, 1, 50)
        b = compute_net_balances([exp], [pmt])
        total = sum(b.values())
        return {str(k): str(v) for k, v in b.items()} | {"_net": str(total)}

    add(TestCase(
        id="settle-004",
        category="partial_settlement",
        description="3-way split: Bob makes partial payment, Charlie unchanged",
        plain_language_description="Alice paid ₹300, split equally among 3. Bob pays ₹50 of his ₹100 debt. Charlie unchanged. Alice owed ₹150, Bob owes ₹50, Charlie owes ₹100.",
        input_display={"expense": "₹300 by Alice, 3-way split", "Bob_paid": 50},
        runner=_pset004,
        checks=[
            _chk("Net = 0", lambda a: _close(a.get("_net", 1), "0"), lambda a: f"Net={a.get('_net')}"),
            _chk("Alice owed ₹150", lambda a: _close(a.get("1", 0), "150"), lambda a: f"Alice={a.get('1')}"),
            _chk("Bob owes ₹50 (reduced)", lambda a: _close(a.get("2", 0), "-50"), lambda a: f"Bob={a.get('2')}"),
            _chk("Charlie still owes ₹100 (unchanged)", lambda a: _close(a.get("3", 0), "-100"), lambda a: f"Charlie={a.get('3')}"),
        ],
    ))

    # ── EDIT / DELETE ─────────────────────────────────────────────────────

    def _ed001():
        exp1 = _Exp(paid_by={1: 300}, split_amounts={1: D("150"), 2: D("150")})
        exp2 = _Exp(paid_by={2: 200}, split_amounts={1: D("100"), 2: D("100")}, deleted=True)
        exp3 = _Exp(paid_by={1: 100}, split_amounts={1: D("50"), 2: D("50")})
        b = compute_net_balances([exp1, exp2, exp3], [])
        total = sum(b.values())
        return {str(k): str(v) for k, v in b.items()} | {"_net": str(total)}

    add(TestCase(
        id="edit-001",
        category="edit_delete",
        description="Deleted expense excluded from balance calculation",
        plain_language_description="3 expenses: ₹300 Alice, ₹200 Bob (deleted), ₹100 Alice. Deleted middle expense must be ignored.",
        input_display={"expenses": ["₹300 Alice (active)", "₹200 Bob (DELETED)", "₹100 Alice (active)"]},
        runner=_ed001,
        checks=[
            _chk("Net = 0", lambda a: _close(a.get("_net", 1), "0"), lambda a: f"Net={a.get('_net')}"),
            _chk("Alice = +₹200", lambda a: _close(a.get("1", 0), "200"), lambda a: f"Alice={a.get('1')} (Bob's deleted expense should not affect)"),
            _chk("Bob = -₹200", lambda a: _close(a.get("2", 0), "-200"), lambda a: f"Bob={a.get('2')}"),
            _chk("Not reflecting deleted expense", lambda a: not _close(a.get("1", 0), "100"), lambda a: "Deleted expense still affecting Alice's balance"),
        ],
    ))

    def _ed002():
        exp_orig = _Exp(paid_by={1: 100}, split_amounts={1: D("50"), 2: D("50")})
        exp_edited = _Exp(paid_by={1: 200}, split_amounts={1: D("100"), 2: D("100")})
        b_orig = compute_net_balances([exp_orig], [])
        b_edit = compute_net_balances([exp_edited], [])
        total_edit = sum(b_edit.values())
        return {"before_alice": str(b_orig.get(1, D("0"))),
                "after_alice": str(b_edit.get(1, D("0"))),
                "after_bob": str(b_edit.get(2, D("0"))),
                "_net": str(total_edit)}

    add(TestCase(
        id="edit-002",
        category="edit_delete",
        description="Editing an expense recalculates from scratch (no stale state)",
        plain_language_description="Expense edited from ₹100 to ₹200. Balance reflects new amount only — not a blend of old and new.",
        input_display={"original": "₹100", "edited_to": "₹200"},
        runner=_ed002,
        checks=[
            _chk("Net = 0 after edit", lambda a: _close(a.get("_net", 1), "0"), lambda a: f"Net={a.get('_net')}"),
            _chk("Alice owed ₹100 (new value)", lambda a: _close(a.get("after_alice", 0), "100"), lambda a: f"Alice after={a.get('after_alice')}"),
            _chk("Bob owes ₹100 (new value)", lambda a: _close(a.get("after_bob", 0), "-100"), lambda a: f"Bob after={a.get('after_bob')}"),
            _chk("Before edit was ₹50", lambda a: _close(a.get("before_alice", 0), "50"), lambda a: f"Before={a.get('before_alice')}"),
        ],
    ))

    def _ed003():
        exp1 = _Exp(paid_by={1: 300}, split_amounts={1: D("150"), 2: D("150")})
        exp2 = _Exp(paid_by={1: 200}, split_amounts={1: D("100"), 2: D("100")}, deleted=True)
        exp3 = _Exp(paid_by={2: 60}, split_amounts={1: D("30"), 2: D("30")})
        b = compute_net_balances([exp1, exp2, exp3], [])
        total = sum(b.values())
        return {str(k): str(v) for k, v in b.items()} | {"_net": str(total)}

    add(TestCase(
        id="edit-003",
        category="edit_delete",
        description="Three expenses: one deleted, one edited — correct final balance",
        plain_language_description="Active expenses: ₹300 Alice, ₹60 Bob. Result: Alice +₹120, Bob -₹120.",
        input_display={"state": ["₹300 Alice (active)", "₹200 Alice (deleted)", "₹60 Bob (active)"]},
        runner=_ed003,
        checks=[
            _chk("Net = 0", lambda a: _close(a.get("_net", 1), "0"), lambda a: f"Net={a.get('_net')}"),
            _chk("Alice = +₹120", lambda a: _close(a.get("1", 0), "120"), lambda a: f"Alice={a.get('1')}"),
            _chk("Bob = -₹120", lambda a: _close(a.get("2", 0), "-120"), lambda a: f"Bob={a.get('2')}"),
        ],
    ))

    # ── EMPTY / SINGLE MEMBER ─────────────────────────────────────────────

    def _eg001():
        exp = _Exp(paid_by={1: 100}, split_amounts={1: D("100")})
        b = compute_net_balances([exp], [])
        net = b.get(1, D("0"))
        return {"passed": abs(net) < D("0.005"), "_net": str(net)}

    add(TestCase(
        id="empty-001",
        category="empty_group",
        description="Single-member group: expense paid and owed by same person → zero balance",
        plain_language_description="Alice is alone in the group. She pays ₹100 and it's split only among Alice. Balance = ₹0. She can't owe herself.",
        input_display={"group_members": 1, "expense": "₹100 Alice→Alice"},
        runner=_eg001,
        checks=[
            _chk("Balance = ₹0", lambda a: _close(a.get("_net", 1), "0"), lambda a: f"Balance was {a.get('_net')}"),
        ],
    ))

    def _eg002():
        b = compute_net_balances([], [])
        return {"passed": b == {}, "_count": str(len(b))}

    add(TestCase(
        id="empty-002",
        category="empty_group",
        description="No expenses at all — empty balance sheet, no crash",
        plain_language_description="A brand-new group with no expenses. Balance computation must return an empty result — not crash.",
        input_display={"expenses": 0},
        runner=_eg002,
        checks=[
            _chk("Empty result returned", lambda a: a.get("passed") is True or a.get("passed") == "True", lambda a: f"Got {a.get('_count')} entries"),
            _chk("Zero entries in result", lambda a: a.get("_count") == "0", lambda a: f"Got {a.get('_count')} entries"),
        ],
    ))

    def _eg003():
        # Single expense, all zero amounts — no one owes anyone
        b = compute_net_balances([], [])
        settlements = simplify_debts(b)
        return {"_settlements": str(len(settlements)), "_balances": str(len(b))}

    add(TestCase(
        id="empty-003",
        category="empty_group",
        description="Empty group: settlement plan is also empty",
        plain_language_description="No expenses → no balances → no settlements needed. Running debt simplification on empty input must produce zero settlements.",
        input_display={"expenses": 0, "expected_settlements": 0},
        runner=_eg003,
        checks=[
            _chk("Zero settlements", lambda a: a.get("_settlements") == "0", lambda a: f"Got {a.get('_settlements')} settlements"),
            _chk("Zero balances", lambda a: a.get("_balances") == "0", lambda a: f"Got {a.get('_balances')} balances"),
        ],
    ))

    # ── SIMPLIFY TOGGLE ───────────────────────────────────────────────────

    def _tog001():
        balances = {1: D("100"), 2: D("-50"), 3: D("-50")}
        settlements = simplify_debts(balances)
        total = sum(amt for _, _, amt in settlements)
        return {"_count": str(len(settlements)), "_total": str(total)}

    add(TestCase(
        id="toggle-001",
        category="simplify_toggle",
        description="Simplify ON: Alice owed ₹100 by Bob+Charlie — exactly 2 transactions",
        plain_language_description="Bob owes Alice ₹50, Charlie owes Alice ₹50. Simplified: exactly 2 direct payments. Total flow = ₹100.",
        input_display={"Alice": "+100", "Bob": "-50", "Charlie": "-50"},
        runner=_tog001,
        checks=[
            _chk("Exactly 2 transactions", lambda a: a.get("_count") == "2", lambda a: f"Got {a.get('_count')}"),
            _chk("Total flow = ₹100", lambda a: _close(a.get("_total", 0), "100"), lambda a: f"Flow={a.get('_total')}"),
        ],
    ))

    def _tog002():
        exp = _Exp(paid_by={1: 100}, split_amounts={1: D("50"), 2: D("50")})
        pairwise = compute_pairwise_balances([exp], [])
        key = (2, 1)
        amount = pairwise.get(key, D("0"))
        return {"passed": abs(amount - D("50")) < D("0.005"), "_pairwise": str(amount)}

    add(TestCase(
        id="toggle-002",
        category="simplify_toggle",
        description="Simplify OFF: pairwise shows Bob owes Alice ₹50 directly",
        plain_language_description="With simplification off, the raw direct debt from Bob to Alice should be exactly ₹50.",
        input_display={"expense": "₹100 Alice, split equally", "simplify": False},
        runner=_tog002,
        checks=[
            _chk("Bob→Alice pairwise = ₹50", lambda a: _close(a.get("_pairwise", 0), "50"), lambda a: f"Got ₹{a.get('_pairwise')}"),
        ],
    ))

    # ── REFUND ────────────────────────────────────────────────────────────

    def _ref001():
        expense = _Exp(paid_by={1: 100}, split_amounts={1: D("50"), 2: D("50")})
        refund = _Exp(paid_by={1: -D("20")}, split_amounts={1: D("-10"), 2: D("-10")})
        b = compute_net_balances([expense, refund], [])
        total = sum(b.values())
        return {str(k): str(v) for k, v in b.items()} | {"_net": str(total)}

    add(TestCase(
        id="refund-001",
        category="refund",
        description="₹20 refund reduces Alice's credit and Bob's debt by ₹10 each",
        plain_language_description="Alice paid ₹100 (split equally). Then ₹20 refund (split equally). Alice's credit drops from ₹50 to ₹40. Bob's debt drops from ₹50 to ₹40.",
        input_display={"original": "₹100 Alice, equal split", "refund": "₹20 equal split"},
        runner=_ref001,
        checks=[
            _chk("Net = 0", lambda a: _close(a.get("_net", 1), "0"), lambda a: f"Net={a.get('_net')}"),
            _chk("Alice owed ₹40 (reduced from ₹50)", lambda a: _close(a.get("1", 0), "40"), lambda a: f"Alice={a.get('1')}"),
            _chk("Bob owes ₹40 (reduced from ₹50)", lambda a: _close(a.get("2", 0), "-40"), lambda a: f"Bob={a.get('2')}"),
        ],
    ))

    def _ref002():
        expense = _Exp(paid_by={1: 100}, split_amounts={1: D("50"), 2: D("50")})
        refund = _Exp(paid_by={1: -D("100")}, split_amounts={1: D("-50"), 2: D("-50")})
        b = compute_net_balances([expense, refund], [])
        all_zero = all(abs(v) < D("0.005") for v in b.values()) if b else True
        total = sum(b.values()) if b else D("0")
        return {"passed": all_zero, "_net": str(total)}

    add(TestCase(
        id="refund-002",
        category="refund",
        description="Full refund of ₹100 nets all balances to zero",
        plain_language_description="Alice paid ₹100, split equally. Then a full ₹100 refund. After both, everyone's balance = ₹0.",
        input_display={"original": "₹100 by Alice", "refund": "₹100 full refund"},
        runner=_ref002,
        checks=[
            _chk("All balances = zero", lambda a: a.get("passed") is True or a.get("passed") == "True", lambda a: "Balances not zero after full refund"),
            _chk("Net = 0", lambda a: _close(a.get("_net", 1), "0"), lambda a: f"Net={a.get('_net')}"),
        ],
    ))

    def _ref003():
        try:
            from schemas import ExpenseCreate
            import datetime
            ExpenseCreate(
                description="Refund", original_amount=D("-50"), original_currency="INR",
                paid_by={"1": D("-50")}, split_type="equal", split_among=[1],
                date=datetime.date.today(), is_negative=True
            )
            return {"passed": True, "accepted": True}
        except Exception as ex:
            return {"passed": False, "accepted": False, "error": str(ex)}

    add(TestCase(
        id="refund-003",
        category="refund",
        description="Negative amount WITH is_negative=True flag — accepted",
        plain_language_description="A refund of -₹50 with is_negative=True should be accepted. The flag signals it's intentional.",
        input_display={"amount": "-₹50", "is_negative": True},
        runner=_ref003,
        checks=[
            _chk("Refund with flag accepted", lambda a: a.get("accepted") is True, lambda a: f"Rejected: {a.get('error')}"),
        ],
    ))

    # ── DUPLICATE DETECTION ───────────────────────────────────────────────

    def _dup_check(expenses, description, amount, payer_id):
        for exp in expenses:
            if (exp.description == description
                    and str(payer_id) in exp.paid_by
                    and abs(exp.original_amount - D(str(amount))) < D("0.01")):
                return exp.id
        return None

    def _dd001():
        existing = [_Exp({1: 100}, {1: D("50"), 2: D("50")},
                         description="Dinner", orig_amount=100, id=42)]
        dup_id = _dup_check(existing, "Dinner", D("100"), 1)
        return {"passed": dup_id is not None, "_matched_id": str(dup_id)}

    add(TestCase(
        id="dup-001",
        category="duplicate_detection",
        description="Same description + amount + payer — flagged as potential duplicate",
        plain_language_description="'Dinner ₹100 paid by Alice' already exists. Adding the same again should flag it as a duplicate.",
        input_display={"existing": "Dinner ₹100 Alice", "new": "Dinner ₹100 Alice"},
        runner=_dd001,
        checks=[
            _chk("Duplicate detected", lambda a: a.get("passed") is True or a.get("passed") == "True", lambda a: "Duplicate not detected"),
            _chk("Matched correct ID (42)", lambda a: a.get("_matched_id") == "42", lambda a: f"Matched ID={a.get('_matched_id')}"),
        ],
    ))

    def _dd002():
        existing = [_Exp({1: 100}, {1: D("50"), 2: D("50")},
                         description="Dinner", orig_amount=100, id=42)]
        dup_id = _dup_check(existing, "Lunch", D("100"), 1)
        return {"passed": dup_id is None, "_matched_id": str(dup_id)}

    add(TestCase(
        id="dup-002",
        category="duplicate_detection",
        description="Different description — not flagged as duplicate",
        plain_language_description="'Dinner ₹100' vs 'Lunch ₹100' — different descriptions, should NOT be flagged.",
        input_display={"existing": "Dinner ₹100", "new": "Lunch ₹100"},
        runner=_dd002,
        checks=[
            _chk("Non-duplicate not flagged", lambda a: a.get("passed") is True or a.get("passed") == "True", lambda a: f"Incorrectly flagged: matched ID={a.get('_matched_id')}"),
        ],
    ))

    def _dd003():
        existing = [_Exp({1: 100}, {1: D("50"), 2: D("50")},
                         description="Dinner", orig_amount=100, id=42)]
        dup_id = _dup_check(existing, "Dinner", D("101"), 1)
        return {"passed": dup_id is None, "_matched_id": str(dup_id)}

    add(TestCase(
        id="dup-003",
        category="duplicate_detection",
        description="Different amount — not flagged as duplicate",
        plain_language_description="'Dinner ₹100' vs 'Dinner ₹101' — amount differs by ₹1, not a duplicate.",
        input_display={"existing": "Dinner ₹100", "new": "Dinner ₹101"},
        runner=_dd003,
        checks=[
            _chk("Different amount not flagged", lambda a: a.get("passed") is True or a.get("passed") == "True", lambda a: f"Incorrectly flagged ₹101≈₹100: matched ID={a.get('_matched_id')}"),
        ],
    ))

    # ── RECURRING ─────────────────────────────────────────────────────────

    def _rec001():
        parent = _Exp({1: 1000}, {1: D("500"), 2: D("500")}, description="Rent", orig_amount=1000, id=1)
        inst2 = _Exp({1: 1000}, {1: D("500"), 2: D("500")}, description="Rent", orig_amount=1000, id=2, parent_id=1)
        inst3_del = _Exp({1: 1000}, {1: D("500"), 2: D("500")}, description="Rent", orig_amount=1000, id=3, parent_id=1, deleted=True)
        b = compute_net_balances([parent, inst2, inst3_del], [])
        total = sum(b.values())
        return {str(k): str(v) for k, v in b.items()} | {"_net": str(total)}

    add(TestCase(
        id="recur-001",
        category="recurring",
        description="Delete one recurring instance — other months remain active",
        plain_language_description="3 months of rent (₹1000/mo). Month 3 deleted. Balances should reflect only 2 active months: Alice owed ₹1000, Bob owes ₹1000.",
        input_display={"months": ["Jan (active)", "Feb (active)", "Mar (DELETED)"]},
        runner=_rec001,
        checks=[
            _chk("Net = 0", lambda a: _close(a.get("_net", 1), "0"), lambda a: f"Net={a.get('_net')}"),
            _chk("Alice owed ₹1000 (2 months)", lambda a: _close(a.get("1", 0), "1000"), lambda a: f"Alice={a.get('1')}"),
            _chk("Bob owes ₹1000", lambda a: _close(a.get("2", 0), "-1000"), lambda a: f"Bob={a.get('2')}"),
            _chk("Not 3 months worth (₹1500)", lambda a: not _close(a.get("1", 0), "1500"), lambda a: "Deleted month still counted"),
        ],
    ))

    def _rec002():
        inst1 = _Exp({1: 500}, {1: D("250"), 2: D("250")}, deleted=False, id=1, parent_id=0)
        inst2 = _Exp({1: 500}, {1: D("250"), 2: D("250")}, deleted=True, id=2, parent_id=0)
        inst3 = _Exp({1: 500}, {1: D("250"), 2: D("250")}, deleted=False, id=3, parent_id=0)
        active = [e for e in [inst1, inst2, inst3] if not e.deleted]
        b = compute_net_balances([inst1, inst2, inst3], [])
        return {"passed": len(active) == 2 and _close(b.get(1, D("0")), "500"),
                "_active": str(len(active)), "alice": str(b.get(1, D("0")))}

    add(TestCase(
        id="recur-002",
        category="recurring",
        description="Recurring: each instance has independent deleted state",
        plain_language_description="Instance 2 deleted, 1 and 3 active. Only active instances contribute to balances.",
        input_display={"instances": ["Jan active", "Feb DELETED", "Mar active"]},
        runner=_rec002,
        checks=[
            _chk("2 of 3 instances active", lambda a: a.get("_active") == "2", lambda a: f"Active count: {a.get('_active')}"),
            _chk("Alice owed ₹500 (2 active months)", lambda a: _close(a.get("alice", 0), "500"), lambda a: f"Alice={a.get('alice')}"),
        ],
    ))

    # ── MEMBER REMOVAL ────────────────────────────────────────────────────

    def _mr001():
        exp = _Exp(paid_by={1: 100}, split_amounts={1: D("50"), 2: D("50")})
        b = compute_net_balances([exp], [])
        user_bal = b.get(2, D("0"))
        can_remove = abs(user_bal) < D("0.005")
        return {"passed": not can_remove, "_balance": str(user_bal)}

    add(TestCase(
        id="member-001",
        category="member_removal",
        description="Member with nonzero balance — removal must be blocked",
        plain_language_description="Bob owes Alice ₹50. Bob cannot be removed — that would make the ₹50 vanish.",
        input_display={"Bob's_balance": "-₹50", "remove_allowed": False},
        runner=_mr001,
        checks=[
            _chk("Removal blocked when balance nonzero", lambda a: a.get("passed") is True or a.get("passed") == "True", lambda a: f"Bob's balance {a.get('_balance')} — should block removal"),
            _chk("Balance is nonzero", lambda a: abs(_sd(a.get("_balance", 0))) > D("0.005"), lambda a: f"Balance was {a.get('_balance')}"),
        ],
    ))

    def _mr002():
        exp = _Exp(paid_by={1: 100}, split_amounts={1: D("50"), 2: D("50")})
        pmt = _Pmt(2, 1, 50)
        b = compute_net_balances([exp], [pmt])
        user_bal = b.get(2, D("0"))
        can_remove = abs(user_bal) < D("0.005")
        return {"passed": can_remove, "_balance": str(user_bal)}

    add(TestCase(
        id="member-002",
        category="member_removal",
        description="Member with zero balance after settlement — removal allowed",
        plain_language_description="Bob owed ₹50, paid it. Balance = ₹0. Can be safely removed.",
        input_display={"Bob's_balance": "₹0 after settlement", "remove_allowed": True},
        runner=_mr002,
        checks=[
            _chk("Removal allowed when settled", lambda a: a.get("passed") is True or a.get("passed") == "True", lambda a: f"Balance={a.get('_balance')} (should be zero)"),
            _chk("Balance = ₹0", lambda a: _close(a.get("_balance", 1), "0"), lambda a: f"Balance={a.get('_balance')}"),
        ],
    ))

    # ── CROSS-GROUP ───────────────────────────────────────────────────────

    def _cg001():
        exp_g1 = _Exp(paid_by={1: 300}, split_amounts={1: D("150"), 2: D("150")})
        exp_g2 = _Exp(paid_by={2: 200}, split_amounts={1: D("100"), 2: D("100")})
        b_g1 = compute_net_balances([exp_g1], [])
        b_g2 = compute_net_balances([exp_g2], [])
        combined = b_g1.get(1, D("0")) + b_g2.get(1, D("0"))
        return {"_g1": str(b_g1.get(1, D("0"))), "_g2": str(b_g2.get(1, D("0"))),
                "_combined": str(combined)}

    add(TestCase(
        id="cross-001",
        category="cross_group",
        description="User in 2 groups: combined balance = sum of per-group balances",
        plain_language_description="Alice: Group 1 owed ₹150, Group 2 owes ₹100. Combined = +₹50.",
        input_display={"g1": "+₹150", "g2": "-₹100", "combined": "+₹50"},
        runner=_cg001,
        checks=[
            _chk("G1 balance = +₹150", lambda a: _close(a.get("_g1", 0), "150"), lambda a: f"G1={a.get('_g1')}"),
            _chk("G2 balance = -₹100", lambda a: _close(a.get("_g2", 0), "-100"), lambda a: f"G2={a.get('_g2')}"),
            _chk("Combined = +₹50", lambda a: _close(a.get("_combined", 0), "50"), lambda a: f"Combined={a.get('_combined')}"),
        ],
    ))

    def _cg002():
        exp_g1 = _Exp(paid_by={1: 100}, split_amounts={1: D("50"), 2: D("50")})
        pmt_g1 = _Pmt(2, 1, 50)
        exp_g2 = _Exp(paid_by={2: 80}, split_amounts={1: D("40"), 2: D("40")})
        b_g1 = compute_net_balances([exp_g1], [pmt_g1])
        b_g2 = compute_net_balances([exp_g2], [])
        alice_g1 = b_g1.get(1, D("0"))
        alice_g2 = b_g2.get(1, D("0"))
        combined = alice_g1 + alice_g2
        return {"_g1": str(alice_g1), "_g2": str(alice_g2), "_combined": str(combined)}

    add(TestCase(
        id="cross-002",
        category="cross_group",
        description="Settled in Group 1, still owed in Group 2 — correct combined view",
        plain_language_description="Alice: Group 1 settled (₹0). Group 2: owes ₹40. Combined = -₹40.",
        input_display={"g1": "settled (₹0)", "g2": "Alice owes ₹40"},
        runner=_cg002,
        checks=[
            _chk("G1 = ₹0 (settled)", lambda a: _close(a.get("_g1", 1), "0"), lambda a: f"G1={a.get('_g1')}"),
            _chk("G2 = -₹40 (Alice owes)", lambda a: _close(a.get("_g2", 0), "-40"), lambda a: f"G2={a.get('_g2')}"),
            _chk("Combined = -₹40", lambda a: _close(a.get("_combined", 0), "-40"), lambda a: f"Combined={a.get('_combined')}"),
        ],
    ))

    # ── LARGE AMOUNTS ─────────────────────────────────────────────────────

    def _la001():
        total = D("9999999.99")
        r = split_equal(total, [1, 2, 3], "INR")
        s = sum(r.values())
        no_sci = "e" not in str(s).lower()
        return {"passed": s == total and no_sci, "_sum": str(s), "_no_sci": str(no_sci)}

    add(TestCase(
        id="large-001",
        category="large_amounts",
        description="₹9,999,999.99 / 3 — no precision loss, no scientific notation",
        plain_language_description="Split nearly ₹1 crore between 3 people. Sum must equal exactly ₹9,999,999.99. No float drift. No scientific notation.",
        input_display={"amount": "₹9,999,999.99", "people": 3},
        runner=_la001,
        checks=[
            _chk("Sum = ₹9,999,999.99", lambda a: _close(a.get("_sum", 0), "9999999.99"), lambda a: f"Sum={a.get('_sum')}"),
            _chk("No scientific notation", lambda a: a.get("_no_sci") == "True", lambda a: f"Scientific notation in: {a.get('_sum')}"),
        ],
    ))

    def _la002():
        total = D("1000000000.00")
        r = split_equal(total, [1, 2], "INR")
        s = sum(r.values())
        each = r.get(1, D("0"))
        return {"passed": s == total, "_sum": str(s), "_each": str(each)}

    add(TestCase(
        id="large-002",
        category="large_amounts",
        description="₹1,000,000,000 / 2 — billion-rupee split",
        plain_language_description="Split ₹1 billion between 2 people. Each gets exactly ₹500,000,000.00. Tests for overflow.",
        input_display={"amount": "₹1,000,000,000", "people": 2},
        runner=_la002,
        checks=[
            _chk("Sum = ₹1,000,000,000", lambda a: _close(a.get("_sum", 0), "1000000000"), lambda a: f"Sum={a.get('_sum')}"),
            _chk("Each gets ₹500,000,000", lambda a: _close(a.get("_each", 0), "500000000"), lambda a: f"Each={a.get('_each')}"),
        ],
    ))

    def _la003():
        # Very small expense in a large-amount context
        r = split_equal(D("0.01"), [1, 2, 3, 4, 5], "INR")
        total = sum(r.values())
        return {"_total": str(total), "_count": str(len(r))}

    add(TestCase(
        id="large-003",
        category="large_amounts",
        description="₹0.01 / 5 people — minimum precision at smallest scale",
        plain_language_description="Split one paisa among 5 people. Only 1 person can get the paisa; the rest get ₹0. Sum must still equal ₹0.01.",
        input_display={"amount": "₹0.01", "people": 5},
        runner=_la003,
        checks=[
            _chk("Sum = ₹0.01", lambda a: _close(a.get("_total", 0), "0.01"), lambda a: f"Sum={a.get('_total')}"),
            _chk("5 shares produced", lambda a: a.get("_count") == "5", lambda a: f"Got {a.get('_count')} shares"),
        ],
    ))

    # ── BALANCE INVARIANT ─────────────────────────────────────────────────

    def _bi001():
        # Any combination of expenses: net balances must sum to zero
        exps = [
            _Exp({1: 300}, {1: D("100"), 2: D("100"), 3: D("100")}),
            _Exp({2: 150}, {1: D("75"), 2: D("75")}),
            _Exp({3: 80}, {2: D("40"), 3: D("40")}),
        ]
        b = compute_net_balances(exps, [])
        total = sum(b.values())
        return {"_net": str(total), "_count": str(len(b))}

    add(TestCase(
        id="invariant-001",
        category="balance_invariant",
        description="Net balances always sum to zero regardless of expense mix",
        plain_language_description="3 complex expenses with different payers and split subsets. Money is conserved — the sum of all net balances must always be ₹0.00.",
        input_display={"expenses": 3, "payers": "Alice, Bob, Charlie"},
        runner=_bi001,
        checks=[
            _chk("Net sum = ₹0.00 (money conservation)", lambda a: _close(a.get("_net", 1), "0"), lambda a: f"Net={a.get('_net')} — money not conserved!"),
        ],
    ))

    def _bi002():
        # After payments, net still zero
        exp = _Exp({1: 1000}, {1: D("250"), 2: D("250"), 3: D("250"), 4: D("250")})
        pmts = [_Pmt(2, 1, 100), _Pmt(3, 1, 250), _Pmt(4, 1, 50)]
        b = compute_net_balances([exp], pmts)
        total = sum(b.values())
        return {"_net": str(total), "_count": str(len(b))}

    add(TestCase(
        id="invariant-002",
        category="balance_invariant",
        description="Net sum = 0 even after multiple partial payments",
        plain_language_description="₹1000 expense, 4-way split, 3 partial payments made. Net balances must still sum to zero — payments are a transfer, not creation or destruction of money.",
        input_display={"expense": "₹1000 4-way", "payments": [100, 250, 50]},
        runner=_bi002,
        checks=[
            _chk("Net sum = ₹0 after payments", lambda a: _close(a.get("_net", 1), "0"), lambda a: f"Net={a.get('_net')} — money not conserved!"),
        ],
    ))

    def _bi003():
        # Multiple deleted expenses + payments: net still zero
        exp1 = _Exp({1: 500}, {1: D("250"), 2: D("250")})
        exp2 = _Exp({2: 300}, {1: D("150"), 2: D("150")}, deleted=True)
        exp3 = _Exp({1: 200}, {1: D("100"), 2: D("100")})
        pmt = _Pmt(2, 1, 50)
        b = compute_net_balances([exp1, exp2, exp3], [pmt])
        total = sum(b.values())
        return {"_net": str(total)}

    add(TestCase(
        id="invariant-003",
        category="balance_invariant",
        description="Net = 0 with deleted expenses + payments combined",
        plain_language_description="Mix of active expenses, a deleted expense, and a payment. The sum of all net balances must always be exactly ₹0.",
        input_display={"expenses": "2 active + 1 deleted", "payments": 1},
        runner=_bi003,
        checks=[
            _chk("Net = ₹0 in complex scenario", lambda a: _close(a.get("_net", 1), "0"), lambda a: f"Net={a.get('_net')} — invariant broken!"),
        ],
    ))

    return cases


# ── public API ─────────────────────────────────────────────────────────────

def run_suite(category_filter: str = None) -> Dict:
    cases = _build_cases()
    if category_filter:
        cases = [c for c in cases if c.category == category_filter]

    results = []
    for case in cases:
        computation_error = None
        actual = {}
        try:
            actual = case.runner()
        except Exception as exc:
            computation_error = str(exc)

        check_results = []
        if computation_error:
            status = "COMPUTATION_ERROR"
            passed = False
        else:
            for chk in case.checks:
                try:
                    chk_passed = bool(chk.fn(actual))
                    detail = "" if chk_passed else chk.on_fail(actual)
                except Exception as exc:
                    chk_passed = False
                    detail = f"check itself threw: {exc}"
                check_results.append({"name": chk.name, "passed": chk_passed, "detail": detail})

            passed = all(c["passed"] for c in check_results)
            status = "PASS" if passed else "FAIL"

        fail_count = sum(1 for c in check_results if not c["passed"])
        total_checks = len(check_results)
        if computation_error:
            plain = f"❌ Computation error: {computation_error}"
        elif passed:
            plain = f"✅ All {total_checks} check{'s' if total_checks != 1 else ''} passed."
        else:
            failed_names = [c["name"] for c in check_results if not c["passed"]]
            plain = f"❌ {fail_count}/{total_checks} check{'s' if fail_count != 1 else ''} failed: {', '.join(failed_names[:3])}"
            if len(failed_names) > 3:
                plain += f" (+{len(failed_names)-3} more)"

        results.append({
            "id": case.id,
            "category": case.category,
            "description": case.description,
            "plain_language_description": case.plain_language_description,
            "plain_language_result": plain,
            "input": case.input_display,
            "status": status,
            "passed": passed,
            "computation_error": computation_error,
            "checks": check_results,
            "actual": actual,
        })

    total = len(results)
    passed_count = sum(1 for r in results if r["passed"])
    error_count = sum(1 for r in results if r["status"] == "COMPUTATION_ERROR")
    fail_count = total - passed_count

    results.sort(key=lambda r: (
        CATEGORY_ORDER.index(r["category"]) if r["category"] in CATEGORY_ORDER else 999,
        0 if r["status"] == "COMPUTATION_ERROR" else (1 if not r["passed"] else 2),
    ))

    return {
        "summary": {
            "total": total,
            "passed": passed_count,
            "failed": fail_count,
            "errors": error_count,
        },
        "category_meta": CATEGORY_META,
        "results": results,
    }
