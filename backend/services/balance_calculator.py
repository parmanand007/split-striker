"""
Balance calculation — always recomputed from scratch (never incremental).
All amounts are in the group's canonical currency.
"""
from collections import defaultdict
from decimal import Decimal
from typing import Dict, List, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from models import Expense, Payment


def _parse_json_amounts(d: dict) -> Dict[int, Decimal]:
    return {int(k): Decimal(str(v)) for k, v in d.items()}


def compute_net_balances(
    expenses: List["Expense"],
    payments: List["Payment"],
) -> Dict[int, Decimal]:
    """
    Returns {user_id: net_balance}.
    Positive  → user is owed money (creditor).
    Negative  → user owes money (debtor).
    """
    balances: Dict[int, Decimal] = defaultdict(Decimal)

    for exp in expenses:
        if exp.deleted:
            continue
        paid_by = _parse_json_amounts(exp.paid_by)
        split_amounts = _parse_json_amounts(exp.split_amounts)

        for uid, paid in paid_by.items():
            balances[uid] += paid          # credit for what they paid

        for uid, owed in split_amounts.items():
            balances[uid] -= owed          # debit for their share

    for pmt in payments:
        # Payment from A to B settles A's debt: A's balance rises, B's credit falls
        balances[pmt.from_user_id] += pmt.amount
        balances[pmt.to_user_id] -= pmt.amount

    # Remove dust (0-balance entries created by defaultdict)
    return {uid: bal for uid, bal in balances.items() if bal != Decimal("0")}


def compute_pairwise_balances(
    expenses: List["Expense"],
    payments: List["Payment"],
) -> Dict[tuple, Decimal]:
    """
    Returns {(from_uid, to_uid): amount} representing raw pairwise obligations.
    Used when simplify_debts is OFF.

    For multi-payer expenses: each participant's share is owed to each payer
    proportionally to what that payer contributed.
    """
    # pairwise[a][b] = amount a owes b (before netting)
    pairwise: Dict[int, Dict[int, Decimal]] = defaultdict(lambda: defaultdict(Decimal))

    for exp in expenses:
        if exp.deleted:
            continue
        paid_by = _parse_json_amounts(exp.paid_by)
        split_amounts = _parse_json_amounts(exp.split_amounts)
        total_paid = sum(paid_by.values())
        if total_paid == 0:
            continue

        for participant, owed in split_amounts.items():
            for payer, paid in paid_by.items():
                if participant == payer:
                    continue   # self — nets to zero
                # participant owes payer this proportion
                frac = (paid / total_paid) * owed
                pairwise[participant][payer] += frac

    for pmt in payments:
        # A payment reduces from_user's obligation to to_user
        pairwise[pmt.from_user_id][pmt.to_user_id] -= pmt.amount

    # Net reciprocal debts
    result: Dict[tuple, Decimal] = {}
    seen = set()
    all_ids = set(pairwise.keys()) | {uid for d in pairwise.values() for uid in d}
    sorted_ids = sorted(all_ids)

    for a in sorted_ids:
        for b in sorted_ids:
            if a >= b:
                continue
            if (a, b) in seen:
                continue
            seen.add((a, b))
            a_owes_b = pairwise[a][b]
            b_owes_a = pairwise[b][a]
            net = a_owes_b - b_owes_a
            if net > Decimal("0.005"):
                result[(a, b)] = net
            elif net < Decimal("-0.005"):
                result[(b, a)] = -net

    return result
