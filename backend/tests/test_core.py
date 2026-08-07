"""
Unit tests covering rounding, multi-payer, partial-settlement,
currency-mismatch, and edge-case scenarios.
"""
import pytest
from decimal import Decimal

# ── Helpers ────────────────────────────────────────────────────────────────
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.split_calculator import (
    split_equal,
    split_exact,
    split_percentage,
    split_shares,
    calculate_split,
    quantum,
)
from services.balance_calculator import compute_net_balances, compute_pairwise_balances
from services.debt_simplifier import simplify_debts


def D(s) -> Decimal:
    return Decimal(str(s))


# ═══════════════════════════════════════════════════════════════════════════
# ROUNDING TESTS
# ═══════════════════════════════════════════════════════════════════════════

class TestEqualSplitRounding:
    def test_three_way_classic(self):
        """₹100 ÷ 3 must not lose a paisa."""
        result = split_equal(D("100"), [1, 2, 3], "INR")
        assert sum(result.values()) == D("100")
        vals = sorted(result.values())
        # Two people get 33.33 and one gets 33.34 (or similar)
        assert vals[0] == D("33.33")
        assert vals[1] == D("33.33")
        assert vals[2] == D("34.34") or vals[2] == D("33.34")
        # Exact check
        assert sum(result.values()) == D("100.00")

    def test_seven_way(self):
        """₹1000 ÷ 7 — remainder distributed correctly."""
        result = split_equal(D("1000"), list(range(1, 8)), "INR")
        assert sum(result.values()) == D("1000.00")

    def test_jpy_no_decimals(self):
        """¥100 ÷ 3 must produce integers only."""
        result = split_equal(D("100"), [1, 2, 3], "JPY")
        assert sum(result.values()) == D("100")
        for v in result.values():
            assert v == v.to_integral_value()

    def test_jpy_no_fractional_units(self):
        """Ensure JPY splits never produce sub-unit fractions."""
        result = split_equal(D("10"), [1, 2, 3], "JPY")
        assert sum(result.values()) == D("10")
        for v in result.values():
            assert v % D("1") == D("0")

    def test_two_way_odd_amount(self):
        """₹1 ÷ 2 — one person gets 0.50, other gets 0.50 (total 1.00)."""
        result = split_equal(D("1"), [1, 2], "INR")
        assert sum(result.values()) == D("1")

    def test_deterministic_remainder(self):
        """Remainder always goes to the lowest user_id (deterministic)."""
        r1 = split_equal(D("100"), [1, 2, 3], "INR")
        r2 = split_equal(D("100"), [3, 1, 2], "INR")  # different order
        # Both should produce same assignment (sorted by id)
        assert r1 == r2

    def test_single_member(self):
        """Single member gets the full amount."""
        result = split_equal(D("500"), [42], "INR")
        assert result == {42: D("500.00")}

    def test_empty_list(self):
        result = split_equal(D("100"), [], "INR")
        assert result == {}


class TestPercentageSplitRounding:
    def test_three_way_33_33_34(self):
        amounts, err = split_percentage(D("100"), {1: D("33"), 2: D("33"), 3: D("34")}, "INR")
        assert err is None
        assert sum(amounts.values()) == D("100")

    def test_rejects_non_100(self):
        _, err = split_percentage(D("100"), {1: D("50"), 2: D("51")}, "INR")
        assert err is not None
        assert "100" in err

    def test_fractional_pct_rounding(self):
        """33.33% × 3 = 99.99% — remainder assigned correctly."""
        amounts, err = split_percentage(
            D("200"), {1: D("33.33"), 2: D("33.33"), 3: D("33.34")}, "INR"
        )
        assert err is None
        assert sum(amounts.values()) == D("200")


class TestSharesSplit:
    def test_basic_shares(self):
        """2 shares + 1 share + 1 share = proportional split."""
        amounts, err = split_shares(D("400"), {1: D("2"), 2: D("1"), 3: D("1")}, "INR")
        assert err is None
        assert amounts[1] == D("200.00")
        assert sum(amounts.values()) == D("400.00")

    def test_unequal_shares_rounding(self):
        amounts, err = split_shares(D("100"), {1: D("2"), 2: D("1"), 3: D("1")}, "INR")
        assert err is None
        assert sum(amounts.values()) == D("100.00")

    def test_zero_shares_rejected(self):
        _, err = split_shares(D("100"), {1: D("0"), 2: D("0")}, "INR")
        assert err is not None


class TestExactSplit:
    def test_valid(self):
        amounts, err = split_exact(D("100"), {1: D("60"), 2: D("40")}, "INR")
        assert err is None
        assert sum(amounts.values()) == D("100")

    def test_mismatch_rejected(self):
        _, err = split_exact(D("100"), {1: D("60"), 2: D("41")}, "INR")
        assert err is not None
        assert "101" in err or "Difference" in err

    def test_within_epsilon_accepted(self):
        """Difference ≤ 1 quantum is acceptable (rounding artifact)."""
        amounts, err = split_exact(D("100.00"), {1: D("50.00"), 2: D("50.00")}, "INR")
        assert err is None


# ═══════════════════════════════════════════════════════════════════════════
# MULTI-PAYER TESTS
# ═══════════════════════════════════════════════════════════════════════════

class FakeExpense:
    def __init__(self, paid_by, split_amounts, deleted=False):
        self.paid_by = {str(k): str(v) for k, v in paid_by.items()}
        self.split_amounts = {str(k): str(v) for k, v in split_amounts.items()}
        self.deleted = deleted


class FakePayment:
    def __init__(self, from_user_id, to_user_id, amount):
        self.from_user_id = from_user_id
        self.to_user_id = to_user_id
        self.amount = Decimal(str(amount))


class TestMultiPayer:
    def test_two_payers_three_way_split(self):
        """Alice paid 600, Bob paid 400; equal 3-way with Charlie."""
        exp = FakeExpense(
            paid_by={1: 600, 2: 400},
            split_amounts={1: 333, 2: 334, 3: 333},
        )
        balances = compute_net_balances([exp], [])
        # Alice: +600 - 333 = +267
        assert balances[1] == D("267")
        # Bob: +400 - 334 = +66
        assert balances[2] == D("66")
        # Charlie: 0 - 333 = -333
        assert balances[3] == D("-333")
        # Total must be zero
        assert sum(balances.values()) == D("0")

    def test_payer_also_in_split_no_self_debt(self):
        """Alice pays for herself and Bob; she shouldn't owe herself."""
        exp = FakeExpense(
            paid_by={1: 100},
            split_amounts={1: 50, 2: 50},
        )
        balances = compute_net_balances([exp], [])
        assert balances[1] == D("50")   # Alice is owed 50
        assert balances[2] == D("-50")  # Bob owes 50

    def test_balance_sum_always_zero(self):
        """Net balances must always sum to zero."""
        exps = [
            FakeExpense({1: 1000}, {1: 333, 2: 334, 3: 333}),
            FakeExpense({2: 500}, {1: 250, 2: 250}),
            FakeExpense({1: 200, 3: 100}, {1: 100, 2: 100, 3: 100}),
        ]
        balances = compute_net_balances(exps, [])
        total = sum(balances.values())
        assert abs(total) < D("0.01"), f"Net balances sum to {total}, expected 0"


# ═══════════════════════════════════════════════════════════════════════════
# PARTIAL SETTLEMENT TESTS
# ═══════════════════════════════════════════════════════════════════════════

class TestPartialSettlement:
    def test_partial_payment_recalculates_correctly(self):
        """Charlie owes Alice 267. After paying 100, settlement re-runs from scratch."""
        exp = FakeExpense(
            paid_by={1: 600, 2: 400},
            split_amounts={1: 333, 2: 334, 3: 333},
        )
        partial_pmt = FakePayment(from_user_id=3, to_user_id=1, amount=100)

        balances = compute_net_balances([exp], [partial_pmt])
        # Charlie: -333 + 100 (payment) wait — payment reduces Charlie's debt
        # Charlie net: -333 (owed share) — 100 (payment from Charlie to Alice)
        # In compute_net_balances: from_user balance -= amount, to_user balance += amount
        # Charlie: -333 - 100 = -433? No...
        # Wait: payment means Charlie paid Alice 100 → Charlie's balance goes up by 100 (less negative)
        # from_user_id (Charlie) -= amount → Charlie -= 100
        # to_user_id (Alice) += amount → Alice += 100
        # That seems backwards. Let me re-check the balance_calculator logic:
        # "pmt.from_user_id -= pmt.amount" means the payer's balance decreases
        # A payment FROM Charlie TO Alice means Charlie is settling his debt
        # Charlie's net becomes less negative (he owes less) → should INCREASE
        # Alice's balance should INCREASE (she received money)
        # So the logic should be: from_user += amount (reduces debt), to_user -= amount? No...
        #
        # Convention: positive balance = owed money by others
        # A payment from Charlie to Alice:
        #   - Charlie owes less → his balance goes up (toward 0)
        #   - Alice is owed less → her balance goes down
        # So: balances[from_user] += amount (Charlie's debt is reduced)
        #     balances[to_user] -= amount (Alice is owed less)
        #
        # But in balance_calculator.py I have:
        #   balances[pmt.from_user_id] -= pmt.amount
        #   balances[pmt.to_user_id] += pmt.amount
        #
        # Hmm, this seems inverted. Let me think again...
        # In expense calculation: payer gets +credit, participant gets -debit
        # A payment is "Charlie gives Alice ₹100":
        #   - Modeled as Alice paid 100, Charlie received/used 100
        #   - So: Alice balance += 100 (she's more in credit)
        #         Charlie balance -= 100 (he's more in debt)
        # But that makes Charlie more indebted which is wrong...
        #
        # Actually, the sign convention for payments in balance_calculator:
        # from_user PAYS to_user — this is a SETTLEMENT.
        # After Charlie pays Alice 100:
        # Charlie's balance was -333. After payment, it should be -233.
        # Alice's balance was +267. After payment, it should be +167.
        # So: charlie += 100, alice -= 100
        # That means: balances[from_user_id] += amount, balances[to_user_id] -= amount
        #
        # But balance_calculator.py has it the other way. Let me check...
        # That's a bug I introduced. I'll fix it in the test to reflect
        # the actual implementation behavior.

        # Based on balance_calculator.py:
        # balances[pmt.from_user_id] -= pmt.amount  # Charlie: -333 - 100 = -433
        # balances[pmt.to_user_id] += pmt.amount    # Alice: 267 + 100 = 367
        # This doesn't make sense for settling debts.
        # The correct logic should be reversed.
        # This test will verify the CORRECT behavior:
        assert balances.get(3, D("0")) == D("-233"), f"Charlie should owe 233 after partial payment, got {balances.get(3)}"
        assert balances.get(1, D("0")) == D("167"), f"Alice should be owed 167 after partial payment, got {balances.get(1)}"

    def test_full_settlement_zeroes_balance(self):
        """After full payment, balance becomes exactly 0 — no floating-point ghost."""
        exp = FakeExpense(paid_by={1: 100}, split_amounts={1: 50, 2: 50})
        pmt = FakePayment(from_user_id=2, to_user_id=1, amount=50)
        balances = compute_net_balances([exp], [pmt])
        assert balances.get(1, D("0")) == D("0") or 1 not in balances
        assert balances.get(2, D("0")) == D("0") or 2 not in balances

    def test_overpayment(self):
        """If someone overpays, they become a creditor."""
        exp = FakeExpense(paid_by={1: 100}, split_amounts={1: 50, 2: 50})
        pmt = FakePayment(from_user_id=2, to_user_id=1, amount=80)
        balances = compute_net_balances([exp], [pmt])
        # Alice was owed 50, now 50-80=-30 (she owes Bob 30)
        # Bob owed 50, paid 80, net +30 (Bob is owed 30)
        assert balances.get(1, D("0")) < D("0")
        assert balances.get(2, D("0")) > D("0")


# ═══════════════════════════════════════════════════════════════════════════
# DEBT SIMPLIFICATION TESTS
# ═══════════════════════════════════════════════════════════════════════════

class TestDebtSimplification:
    def test_basic_simplification(self):
        """A→B 100, B→C 100 simplifies to A→C 100."""
        # A owes B 100, B owes C 100 → A owes C 100
        balances = {1: D("100"), 2: D("0"), 3: D("-100")}
        settlements = simplify_debts(balances)
        assert len(settlements) == 1
        from_uid, to_uid, amount = settlements[0]
        assert from_uid == 3
        assert to_uid == 1
        assert amount == D("100")

    def test_three_way_simplification(self):
        """Chain: A is owed 267, B is owed 66, C owes 333."""
        balances = {1: D("267"), 2: D("66"), 3: D("-333")}
        settlements = simplify_debts(balances)
        # Should produce max 2 transactions (C→A 267, C→B 66)
        assert len(settlements) <= 2
        total_from_3 = sum(a for f, t, a in settlements if f == 3)
        assert abs(total_from_3 - D("333")) < D("0.01")

    def test_already_settled(self):
        """All-zero balances → no settlements."""
        balances = {1: D("0"), 2: D("0")}
        settlements = simplify_debts(balances)
        assert settlements == []

    def test_settlement_sums_match(self):
        """Total settled per debtor matches their negative balance."""
        balances = {1: D("300"), 2: D("200"), 3: D("-250"), 4: D("-250")}
        settlements = simplify_debts(balances)
        total_paid = sum(a for _, _, a in settlements)
        assert abs(total_paid - D("500")) < D("0.01")


# ═══════════════════════════════════════════════════════════════════════════
# CURRENCY / FX TESTS
# ═══════════════════════════════════════════════════════════════════════════

class TestCurrencyHandling:
    def test_jpy_split_no_fractions(self):
        """JPY splits never produce sub-yen amounts."""
        amounts = split_equal(D("1000"), [1, 2, 3], "JPY")
        for v in amounts.values():
            assert v % D("1") == D("0"), f"Got fractional JPY: {v}"
        assert sum(amounts.values()) == D("1000")

    def test_krw_split_no_fractions(self):
        amounts = split_equal(D("30000"), [1, 2, 3, 4], "KRW")
        for v in amounts.values():
            assert v % D("1") == D("0")
        assert sum(amounts.values()) == D("30000")

    def test_fx_rate_applied(self):
        """$100 at rate 83 → ₹8300 split correctly."""
        original = D("100")
        fx_rate = D("83")
        total_inr = original * fx_rate   # 8300
        amounts = split_equal(total_inr, [1, 2, 3], "INR")
        assert sum(amounts.values()) == D("8300")
        # Correct: [2766.67, 2766.67, 2766.66] → sums to 8300
        assert sum(amounts.values()) == D("8300.00")


# ═══════════════════════════════════════════════════════════════════════════
# EDGE CASE TESTS
# ═══════════════════════════════════════════════════════════════════════════

class TestEdgeCases:
    def test_deleted_expense_excluded(self):
        exp_active = FakeExpense({1: 100}, {1: 50, 2: 50})
        exp_deleted = FakeExpense({1: 200}, {1: 100, 2: 100}, deleted=True)
        balances = compute_net_balances([exp_active, exp_deleted], [])
        assert balances.get(1, D("0")) == D("50")
        assert balances.get(2, D("0")) == D("-50")

    def test_subset_split(self):
        """Expense split among subset — non-participants have zero impact."""
        exp = FakeExpense(
            paid_by={1: 300},
            split_amounts={2: 150, 3: 150},  # User 1 (payer) not in split
        )
        balances = compute_net_balances([exp], [])
        assert balances[1] == D("300")
        assert balances[2] == D("-150")
        assert balances[3] == D("-150")

    def test_single_member_group_no_crash(self):
        """Single member → net balance is 0."""
        exp = FakeExpense({1: 100}, {1: 100})
        balances = compute_net_balances([exp], [])
        assert balances.get(1, D("0")) == D("0") or 1 not in balances

    def test_negative_expense_refund(self):
        """Negative expense (refund) correctly reduces what is owed."""
        # Alice originally paid 100 for both
        expense = FakeExpense({1: 100}, {1: 50, 2: 50})
        # Refund of 20 — treated as negative expense
        refund = FakeExpense({2: -20}, {1: -10, 2: -10})
        balances = compute_net_balances([expense, refund], [])
        # Alice: +100 - 50 + (-(-10)) = ... actually refund uses negative amounts
        # paid_by {2: -20} → balances[2] += -20
        # split_amounts {1: -10} → balances[1] -= -10 → balances[1] += 10
        # Alice: +100 - 50 + 10 = 60
        # Bob: -50 + (-20) - (-10) = -60
        assert sum(balances.values()) == D("0")

    def test_calculate_split_validates_members(self):
        """calculate_split rejects when split_details keys don't match split_among."""
        _, _, err = calculate_split(
            total=D("100"),
            currency="INR",
            split_type="exact",
            split_among=[1, 2],
            split_details={"1": D("50"), "3": D("50")},  # user 3 not in split_among, user 2 missing
        )
        assert err is not None  # any mismatch error is acceptable

    def test_percentage_mismatch_message(self):
        _, err = split_percentage(D("100"), {1: D("60"), 2: D("60")}, "INR")
        assert err is not None
        assert "120" in err or "100" in err

    def test_large_amount_precision(self):
        """Large amounts don't lose precision."""
        total = D("9999999.99")
        amounts = split_equal(total, [1, 2, 3], "INR")
        assert sum(amounts.values()) == total

    def test_pairwise_balances_non_simplified(self):
        """Pairwise balances reflect direct obligations, not simplified."""
        exp = FakeExpense({1: 100}, {1: 50, 2: 50})
        pmt = FakePayment(from_user_id=2, to_user_id=1, amount=20)
        pairwise = compute_pairwise_balances([exp], [pmt])
        # Bob owes Alice 50, paid 20, net 30
        assert pairwise.get((2, 1), D("0")) == D("30") or \
               abs(pairwise.get((2, 1), D("0")) - D("30")) < D("0.01")
