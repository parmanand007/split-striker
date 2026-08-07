"""
Greedy debt simplification (minimises number of transactions).
Re-run on full current balances — never patch incrementally.
"""
from decimal import Decimal
from typing import Dict, List, Tuple


def simplify_debts(
    balances: Dict[int, Decimal],
) -> List[Tuple[int, int, Decimal]]:
    """
    Given net balances {user_id: amount}, return a minimal list of
    (from_uid, to_uid, amount) settlements.

    Positive balance → creditor (owed money).
    Negative balance → debtor (owes money).
    """
    creditors: List[List] = [[uid, bal] for uid, bal in balances.items() if bal > 0]
    debtors: List[List] = [[uid, -bal] for uid, bal in balances.items() if bal < 0]

    creditors.sort(key=lambda x: -x[1])
    debtors.sort(key=lambda x: -x[1])

    settlements: List[Tuple[int, int, Decimal]] = []
    i = j = 0

    while i < len(creditors) and j < len(debtors):
        cred_uid, cred_amt = creditors[i]
        debt_uid, debt_amt = debtors[j]

        transfer = min(cred_amt, debt_amt)
        if transfer > Decimal("0.005"):
            settlements.append((debt_uid, cred_uid, transfer))

        creditors[i][1] -= transfer
        debtors[j][1] -= transfer

        if creditors[i][1] < Decimal("0.005"):
            i += 1
        if debtors[j][1] < Decimal("0.005"):
            j += 1

    return settlements
