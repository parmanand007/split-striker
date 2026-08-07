# SplitEase

A full-featured expense-splitting app — Splitwise mechanics rebuilt from scratch with careful attention to the edge cases that make real money-splitting apps hard.

## Quick Start

### Backend

```bash
cd backendd
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev           # http://localhost:5173
```

The Vite dev server proxies `/api/*` to `http://localhost:8000`.

### Tests

```bash
cd backend
python -m pytest tests/test_core.py -v
```

All 38 tests cover rounding, multi-payer, partial settlement, and currency edge cases.

---

## Architecture decisions

### Currency handling

**Decision: single canonical currency per group, with FX snapshot at creation time.**

Every group has a `currency` field (default `INR`). All balance calculations happen in that currency. When an expense is entered in a different currency (e.g. USD in an INR group), the UI requires an explicit FX rate at entry time. The backend stores:

- `original_amount` + `original_currency` — for display (shows "$100 USD")
- `fx_rate` — the snapshot rate the user provided
- `total_amount` = `original_amount × fx_rate` — the canonical INR amount used in all balance math
- `paid_by` and `split_amounts` — always in group currency (post-conversion)

This means: **there is no silent currency mixing**. The balance sheet is always in one currency. If you don't provide a rate, the API returns 400.

Rationale: live FX is a non-goal for MVP; storing a snapshot prevents "the balance changed because the dollar moved" surprises. The group owner decides the rate at time of entry.

### Rounding

**Decision: ROUND_DOWN each share, distribute remainder to first N users by ascending user_id.**

For ₹100 ÷ 3 people:
- Each gets ROUND_DOWN(33.333...) = ₹33.33
- Total assigned: ₹99.99; remainder: ₹0.01
- First person (lowest ID) gets +₹0.01 → they pay ₹33.34

Result: [33.34, 33.33, 33.33] — sums to exactly ₹100.00.

All monetary math uses Python's `Decimal`, never `float`. The remainder distribution is deterministic (sorted user_id), so the same expense always produces the same split.

**Currencies with no decimal units** (JPY, KRW, VND, and ~12 others): `decimal_places()` returns 0, so the quantum is 1 whole unit and no fractional amounts are ever stored.

### Debt simplification

When `simplify_debts=True` (default): greedy algorithm minimises the number of transactions. Creditors and debtors are sorted by amount, largest first, and matched greedily.

When `simplify_debts=False`: raw pairwise obligations computed from individual transactions — each participant's share is attributed to each payer proportionally to what each payer contributed. Payments are applied directly to the pairwise matrix.

The toggle is per-group and can be changed at any time. Balances are always recomputed from scratch (never patched incrementally).

### Balance recalculation

Balances are never stored — they are always recomputed from the full expense + payment history on demand. This means:

- Editing an expense automatically recalculates everything (no stale state)
- Deleting (soft-delete) removes the expense from balance math immediately
- Partial payments are naturally handled — the settlement plan re-runs on the new net balances
- No "phantom ₹0.0000004" balances from incremental floating-point patches

---

## Key features

| Feature | Notes |
|---|---|
| Equal / exact / percentage / shares splits | All four types, with validation |
| Multiple payers on one expense | `paid_by` is a map, not a single user |
| Split among a subset | Non-participants excluded from `split_amounts` |
| Soft delete + audit log | Deletes are never hard; ActivityLog records every change |
| Recurring expenses | Weekly or monthly with end date; edit one without affecting series |
| Friend (group-less) expenses | Two-person splits outside any group |
| Duplicate detection | 5-minute window check returns a warning (not a block) |
| Remove member with balance | Blocked with a clear error until settled |
| Simplify debts toggle | Per-group; raw pairwise view available |
| Zero/negative amounts | Zero is rejected; negatives require `is_negative=true` flag |
| Currency mismatch | FX rate required; stored as snapshot, not live |
| No-decimal currencies | JPY/KRW/etc. produce integer-only splits |
| Cross-group user summary | Total owed/owing per currency across all groups |
| Activity feed | Tracks create/edit/delete/payment/member changes |
