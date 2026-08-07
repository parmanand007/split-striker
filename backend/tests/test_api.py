"""
Comprehensive API integration tests — every endpoint, every flow.
Each test gets a fresh in-memory SQLite database.
Run: pytest backend/tests/ -v
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base, get_db
from main import app

SQLALCHEMY_TEST_URL = "sqlite:///:memory:"
_engine = create_engine(
    SQLALCHEMY_TEST_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
_Session = sessionmaker(autocommit=False, autoflush=False, bind=_engine)


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.create_all(bind=_engine)
    yield
    Base.metadata.drop_all(bind=_engine)


@pytest.fixture
def client():
    def override_db():
        db = _Session()
        try:
            yield db
        finally:
            db.close()
    app.dependency_overrides[get_db] = override_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ── Helpers ─────────────────────────────────────────────────────────────────

def mk_user(client, name="Alice", email="alice@test.com"):
    r = client.post("/api/users", json={"name": name, "email": email})
    assert r.status_code == 201, r.text
    return r.json()

def mk_group(client, name="Trip", currency="INR", members=(), owner_id=None):
    r = client.post("/api/groups", json={
        "name": name, "currency": currency,
        "member_ids": list(members), "created_by_id": owner_id,
    })
    assert r.status_code == 201, r.text
    return r.json()

def mk_expense(client, gid, desc, amount, payer_id, split_ids, date="2025-01-01", split_type="equal"):
    r = client.post(f"/api/groups/{gid}/expenses", json={
        "description": desc,
        "original_amount": str(amount),
        "original_currency": "INR",
        "paid_by": {str(payer_id): str(amount)},
        "split_type": split_type,
        "split_among": list(split_ids),
        "date": date,
        "actor_user_id": payer_id,
    })
    assert r.status_code == 201, r.text
    return r.json()

def mk_payment(client, gid, from_id, to_id, amount, date="2025-01-02"):
    r = client.post(f"/api/groups/{gid}/payments", json={
        "from_user_id": from_id, "to_user_id": to_id,
        "amount": str(amount), "currency": "INR", "date": date,
    })
    assert r.status_code == 201, r.text
    return r.json()


# ════════════════════════════════════════════════════════════════════════════
# HEALTH
# ════════════════════════════════════════════════════════════════════════════

class TestHealth:
    def test_health_returns_ok(self, client):
        r = client.get("/api/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"


# ════════════════════════════════════════════════════════════════════════════
# USERS
# ════════════════════════════════════════════════════════════════════════════

class TestUsers:
    def test_create_user_success(self, client):
        r = client.post("/api/users", json={"name": "Alice", "email": "alice@test.com"})
        assert r.status_code == 201
        d = r.json()
        assert d["name"] == "Alice"
        assert d["email"] == "alice@test.com"
        assert isinstance(d["id"], int)

    def test_duplicate_email_rejected(self, client):
        mk_user(client, "Alice", "alice@test.com")
        r = client.post("/api/users", json={"name": "Alice2", "email": "alice@test.com"})
        assert r.status_code == 400
        assert "already exists" in r.json()["detail"].lower()

    def test_email_normalized_to_lowercase(self, client):
        mk_user(client, "Alice", "Alice@Test.COM")
        r = client.post("/api/users", json={"name": "X", "email": "alice@test.com"})
        assert r.status_code == 400  # treated as duplicate

    def test_login_by_email_success(self, client):
        mk_user(client, "Alice", "alice@test.com")
        r = client.post("/api/users/login", json={"email": "alice@test.com"})
        assert r.status_code == 200
        assert r.json()["name"] == "Alice"

    def test_login_email_case_insensitive(self, client):
        mk_user(client, "Alice", "alice@test.com")
        r = client.post("/api/users/login", json={"email": "ALICE@TEST.COM"})
        assert r.status_code == 200

    def test_login_unknown_email_404(self, client):
        r = client.post("/api/users/login", json={"email": "ghost@test.com"})
        assert r.status_code == 404

    def test_get_user_by_id(self, client):
        u = mk_user(client)
        r = client.get(f"/api/users/{u['id']}")
        assert r.status_code == 200
        assert r.json()["id"] == u["id"]

    def test_get_nonexistent_user_404(self, client):
        assert client.get("/api/users/99999").status_code == 404

    def test_list_users_returns_all(self, client):
        mk_user(client, "Alice", "a@t.com")
        mk_user(client, "Bob", "b@t.com")
        r = client.get("/api/users")
        assert r.status_code == 200
        assert len(r.json()) == 2

    def test_user_summary_empty_groups(self, client):
        u = mk_user(client)
        r = client.get(f"/api/users/{u['id']}/summary")
        assert r.status_code == 200
        assert r.json()["total_owed"] == {}
        assert r.json()["total_owing"] == {}

    def test_user_summary_shows_owed(self, client):
        a = mk_user(client, "Alice", "a@t.com")
        b = mk_user(client, "Bob", "b@t.com")
        g = mk_group(client, members=[a["id"], b["id"]])
        mk_expense(client, g["id"], "Dinner", 100, a["id"], [a["id"], b["id"]])
        r = client.get(f"/api/users/{a['id']}/summary")
        assert float(r.json()["total_owed"]["INR"]) == 50.0

    def test_user_summary_shows_owing(self, client):
        a = mk_user(client, "Alice", "a@t.com")
        b = mk_user(client, "Bob", "b@t.com")
        g = mk_group(client, members=[a["id"], b["id"]])
        mk_expense(client, g["id"], "Dinner", 100, a["id"], [a["id"], b["id"]])
        r = client.get(f"/api/users/{b['id']}/summary")
        assert float(r.json()["total_owing"]["INR"]) == 50.0

    def test_user_summary_cleared_after_payment(self, client):
        a = mk_user(client, "Alice", "a@t.com")
        b = mk_user(client, "Bob", "b@t.com")
        g = mk_group(client, members=[a["id"], b["id"]])
        mk_expense(client, g["id"], "Dinner", 100, a["id"], [a["id"], b["id"]])
        mk_payment(client, g["id"], b["id"], a["id"], 50)
        r = client.get(f"/api/users/{a['id']}/summary")
        assert r.json()["total_owed"] == {}


# ════════════════════════════════════════════════════════════════════════════
# AUTH
# ════════════════════════════════════════════════════════════════════════════

class TestAuth:
    def test_signup_creates_user_and_returns_token(self, client):
        r = client.post("/api/auth/signup", json={"name": "Alice", "email": "a@t.com", "password": "secret123"})
        assert r.status_code == 201
        d = r.json()
        assert "token" in d
        assert d["user"]["name"] == "Alice"
        assert d["user"]["email"] == "a@t.com"

    def test_login_returns_token(self, client):
        client.post("/api/auth/signup", json={"name": "Alice", "email": "a@t.com", "password": "secret123"})
        r = client.post("/api/auth/login", json={"email": "a@t.com", "password": "secret123"})
        assert r.status_code == 200
        d = r.json()
        assert "token" in d
        assert d["user"]["email"] == "a@t.com"

    def test_login_wrong_password_401(self, client):
        client.post("/api/auth/signup", json={"name": "Alice", "email": "a@t.com", "password": "secret123"})
        r = client.post("/api/auth/login", json={"email": "a@t.com", "password": "wrongpass"})
        assert r.status_code == 401

    def test_login_unknown_email_401(self, client):
        r = client.post("/api/auth/login", json={"email": "ghost@t.com", "password": "any"})
        assert r.status_code == 401

    def test_signup_duplicate_email_400(self, client):
        client.post("/api/auth/signup", json={"name": "Alice", "email": "a@t.com", "password": "secret123"})
        r = client.post("/api/auth/signup", json={"name": "Bob", "email": "a@t.com", "password": "other"})
        assert r.status_code == 400
        assert "already exists" in r.json()["detail"].lower()

    def test_login_email_case_insensitive(self, client):
        client.post("/api/auth/signup", json={"name": "Alice", "email": "a@t.com", "password": "secret123"})
        r = client.post("/api/auth/login", json={"email": "A@T.COM", "password": "secret123"})
        assert r.status_code == 200

    def test_user_without_password_cannot_login(self, client):
        # user created via old /api/users path (no password)
        mk_user(client, "NoPass", "nopass@t.com")
        r = client.post("/api/auth/login", json={"email": "nopass@t.com", "password": "anything"})
        assert r.status_code == 401


# ════════════════════════════════════════════════════════════════════════════
# GROUPS
# ════════════════════════════════════════════════════════════════════════════

class TestGroups:
    def test_create_group_basic(self, client):
        u = mk_user(client)
        r = client.post("/api/groups", json={
            "name": "Goa Trip", "currency": "INR",
            "member_ids": [u["id"]], "created_by_id": u["id"],
        })
        assert r.status_code == 201
        assert r.json()["name"] == "Goa Trip"
        assert len(r.json()["members"]) == 1

    def test_currency_uppercased(self, client):
        u = mk_user(client)
        g = mk_group(client, currency="usd", members=[u["id"]])
        assert g["currency"] == "USD"

    def test_list_groups_filtered_by_user(self, client):
        a = mk_user(client, "Alice", "a@t.com")
        b = mk_user(client, "Bob", "b@t.com")
        mk_group(client, "A's Group", members=[a["id"]])
        mk_group(client, "B's Group", members=[b["id"]])
        r = client.get(f"/api/groups?user_id={a['id']}")
        names = [g["name"] for g in r.json()]
        assert "A's Group" in names
        assert "B's Group" not in names

    def test_get_group(self, client):
        u = mk_user(client)
        g = mk_group(client, members=[u["id"]])
        r = client.get(f"/api/groups/{g['id']}")
        assert r.status_code == 200
        assert r.json()["id"] == g["id"]

    def test_get_nonexistent_group_404(self, client):
        assert client.get("/api/groups/99999").status_code == 404

    def test_update_group_name(self, client):
        u = mk_user(client)
        g = mk_group(client, members=[u["id"]])
        r = client.put(f"/api/groups/{g['id']}", json={"name": "Renamed"})
        assert r.status_code == 200
        assert r.json()["name"] == "Renamed"

    def test_archive_group(self, client):
        u = mk_user(client)
        g = mk_group(client, members=[u["id"]])
        r = client.put(f"/api/groups/{g['id']}", json={"archived": True})
        assert r.json()["archived"] is True

    def test_add_member(self, client):
        a = mk_user(client, "Alice", "a@t.com")
        b = mk_user(client, "Bob", "b@t.com")
        g = mk_group(client, members=[a["id"]])
        r = client.post(f"/api/groups/{g['id']}/members", json={"user_id": b["id"]})
        assert r.status_code == 200
        assert b["id"] in [m["id"] for m in r.json()["members"]]

    def test_add_duplicate_member_rejected(self, client):
        a = mk_user(client)
        g = mk_group(client, members=[a["id"]])
        r = client.post(f"/api/groups/{g['id']}/members", json={"user_id": a["id"]})
        assert r.status_code == 400

    def test_add_member_to_archived_group_rejected(self, client):
        a = mk_user(client, "Alice", "a@t.com")
        b = mk_user(client, "Bob", "b@t.com")
        g = mk_group(client, members=[a["id"]])
        client.put(f"/api/groups/{g['id']}", json={"archived": True})
        r = client.post(f"/api/groups/{g['id']}/members", json={"user_id": b["id"]})
        assert r.status_code == 400

    def test_remove_member_zero_balance_ok(self, client):
        a = mk_user(client, "Alice", "a@t.com")
        b = mk_user(client, "Bob", "b@t.com")
        g = mk_group(client, members=[a["id"], b["id"]])
        r = client.delete(f"/api/groups/{g['id']}/members/{b['id']}")
        assert r.status_code == 200
        assert b["id"] not in [m["id"] for m in r.json()["members"]]

    def test_remove_member_nonzero_balance_rejected(self, client):
        a = mk_user(client, "Alice", "a@t.com")
        b = mk_user(client, "Bob", "b@t.com")
        g = mk_group(client, members=[a["id"], b["id"]])
        mk_expense(client, g["id"], "Dinner", 100, a["id"], [a["id"], b["id"]])
        r = client.delete(f"/api/groups/{g['id']}/members/{b['id']}")
        assert r.status_code == 400
        assert "nonzero balance" in r.json()["detail"].lower()


# ════════════════════════════════════════════════════════════════════════════
# EXPENSES
# ════════════════════════════════════════════════════════════════════════════

class TestExpenses:
    def _setup(self, client):
        a = mk_user(client, "Alice", "a@t.com")
        b = mk_user(client, "Bob", "b@t.com")
        c = mk_user(client, "Charlie", "c@t.com")
        g = mk_group(client, members=[a["id"], b["id"], c["id"]])
        return a, b, c, g

    def test_equal_split_sums_correctly(self, client):
        a, b, c, g = self._setup(client)
        exp = mk_expense(client, g["id"], "Dinner", 300, a["id"], [a["id"], b["id"], c["id"]])
        total = sum(float(v) for v in exp["split_amounts"].values())
        assert abs(total - 300) < 0.01

    def test_exact_split(self, client):
        a, b, c, g = self._setup(client)
        r = client.post(f"/api/groups/{g['id']}/expenses", json={
            "description": "Cab", "original_amount": "100",
            "original_currency": "INR",
            "paid_by": {str(a["id"]): "100"},
            "split_type": "exact", "split_among": [a["id"], b["id"]],
            "split_details": {str(a["id"]): "60", str(b["id"]): "40"},
            "date": "2025-01-01",
        })
        assert r.status_code == 201
        assert r.json()["split_amounts"][str(a["id"])] == "60"
        assert r.json()["split_amounts"][str(b["id"])] == "40"

    def test_percentage_split(self, client):
        a, b, c, g = self._setup(client)
        r = client.post(f"/api/groups/{g['id']}/expenses", json={
            "description": "Hotel", "original_amount": "200",
            "original_currency": "INR",
            "paid_by": {str(a["id"]): "200"},
            "split_type": "percentage", "split_among": [a["id"], b["id"]],
            "split_details": {str(a["id"]): "70", str(b["id"]): "30"},
            "date": "2025-01-01",
        })
        assert r.status_code == 201
        assert abs(float(r.json()["split_amounts"][str(a["id"])]) - 140) < 0.01

    def test_shares_split(self, client):
        a, b, c, g = self._setup(client)
        r = client.post(f"/api/groups/{g['id']}/expenses", json={
            "description": "Food", "original_amount": "400",
            "original_currency": "INR",
            "paid_by": {str(a["id"]): "400"},
            "split_type": "shares", "split_among": [a["id"], b["id"], c["id"]],
            "split_details": {str(a["id"]): "2", str(b["id"]): "1", str(c["id"]): "1"},
            "date": "2025-01-01",
        })
        assert r.status_code == 201
        assert abs(float(r.json()["split_amounts"][str(a["id"])]) - 200) < 0.01

    def test_multi_payer_expense(self, client):
        a, b, c, g = self._setup(client)
        r = client.post(f"/api/groups/{g['id']}/expenses", json={
            "description": "Hotel", "original_amount": "1000",
            "original_currency": "INR",
            "paid_by": {str(a["id"]): "600", str(b["id"]): "400"},
            "split_type": "equal",
            "split_among": [a["id"], b["id"], c["id"]],
            "date": "2025-01-01",
        })
        assert r.status_code == 201
        total_split = sum(float(v) for v in r.json()["split_amounts"].values())
        assert abs(total_split - 1000) < 0.01

    def test_nonmember_in_split_rejected(self, client):
        a, b, c, g = self._setup(client)
        outsider = mk_user(client, "Eve", "e@t.com")
        r = client.post(f"/api/groups/{g['id']}/expenses", json={
            "description": "Test", "original_amount": "100",
            "original_currency": "INR",
            "paid_by": {str(a["id"]): "100"},
            "split_type": "equal",
            "split_among": [a["id"], outsider["id"]],
            "date": "2025-01-01",
        })
        assert r.status_code == 400

    def test_archived_group_rejects_expense(self, client):
        a, b, c, g = self._setup(client)
        client.put(f"/api/groups/{g['id']}", json={"archived": True})
        r = client.post(f"/api/groups/{g['id']}/expenses", json={
            "description": "Test", "original_amount": "100",
            "original_currency": "INR",
            "paid_by": {str(a["id"]): "100"},
            "split_type": "equal", "split_among": [a["id"], b["id"]],
            "date": "2025-01-01",
        })
        assert r.status_code == 400

    def test_fx_rate_applied(self, client):
        a, b, c, g = self._setup(client)
        r = client.post(f"/api/groups/{g['id']}/expenses", json={
            "description": "USD coffee", "original_amount": "10",
            "original_currency": "USD", "fx_rate": "83",
            "paid_by": {str(a["id"]): "10"},
            "split_type": "equal", "split_among": [a["id"], b["id"]],
            "date": "2025-01-01",
        })
        assert r.status_code == 201
        assert abs(float(r.json()["total_amount"]) - 830) < 0.01

    def test_negative_expense_refund(self, client):
        a, b, c, g = self._setup(client)
        r = client.post(f"/api/groups/{g['id']}/expenses", json={
            "description": "Refund", "original_amount": "-50",
            "original_currency": "INR",
            "paid_by": {str(a["id"]): "-50"},
            "split_type": "equal", "split_among": [a["id"], b["id"]],
            "is_negative": True, "date": "2025-01-01",
        })
        assert r.status_code == 201
        assert r.json()["is_negative"] is True

    def test_list_expenses_excludes_deleted(self, client):
        a, b, c, g = self._setup(client)
        e1 = mk_expense(client, g["id"], "Keep", 100, a["id"], [a["id"], b["id"]])
        e2 = mk_expense(client, g["id"], "Delete", 50, a["id"], [a["id"], b["id"]])
        client.delete(f"/api/expenses/{e2['id']}")
        r = client.get(f"/api/groups/{g['id']}/expenses")
        ids = [e["id"] for e in r.json()]
        assert e1["id"] in ids
        assert e2["id"] not in ids

    def test_list_expenses_include_deleted_flag(self, client):
        a, b, c, g = self._setup(client)
        e = mk_expense(client, g["id"], "Del", 50, a["id"], [a["id"]])
        client.delete(f"/api/expenses/{e['id']}")
        r = client.get(f"/api/groups/{g['id']}/expenses?include_deleted=true")
        ids = [x["id"] for x in r.json()]
        assert e["id"] in ids

    def test_update_expense_description(self, client):
        a, b, c, g = self._setup(client)
        e = mk_expense(client, g["id"], "Old", 100, a["id"], [a["id"], b["id"]])
        r = client.put(f"/api/expenses/{e['id']}", json={"description": "New"})
        assert r.status_code == 200
        assert r.json()["description"] == "New"

    def test_update_expense_amount_recalculates_split(self, client):
        a, b, c, g = self._setup(client)
        e = mk_expense(client, g["id"], "D", 100, a["id"], [a["id"], b["id"]])
        r = client.put(f"/api/expenses/{e['id']}", json={
            "original_amount": "200",
            "original_currency": "INR",
            "paid_by": {str(a["id"]): "200"},
            "split_type": "equal",
            "split_among": [a["id"], b["id"]],
        })
        assert r.status_code == 200
        total = sum(float(v) for v in r.json()["split_amounts"].values())
        assert abs(total - 200) < 0.01

    def test_delete_expense_soft(self, client):
        a, b, c, g = self._setup(client)
        e = mk_expense(client, g["id"], "Dinner", 100, a["id"], [a["id"], b["id"]])
        r = client.delete(f"/api/expenses/{e['id']}?actor_user_id={a['id']}")
        assert r.status_code == 204

    def test_delete_twice_404(self, client):
        a, b, c, g = self._setup(client)
        e = mk_expense(client, g["id"], "X", 100, a["id"], [a["id"]])
        client.delete(f"/api/expenses/{e['id']}")
        r = client.delete(f"/api/expenses/{e['id']}")
        assert r.status_code == 404

    def test_duplicate_check_hit(self, client):
        a, b, c, g = self._setup(client)
        mk_expense(client, g["id"], "Coffee", 50, a["id"], [a["id"], b["id"]])
        r = client.get(
            f"/api/groups/{g['id']}/expenses/check-duplicate"
            f"?description=Coffee&amount=50&payer_id={a['id']}"
        )
        assert r.json()["is_duplicate"] is True

    def test_duplicate_check_miss(self, client):
        a, b, c, g = self._setup(client)
        r = client.get(
            f"/api/groups/{g['id']}/expenses/check-duplicate"
            f"?description=Coffee&amount=50&payer_id={a['id']}"
        )
        assert r.json()["is_duplicate"] is False

    def test_percentage_not_100_rejected(self, client):
        a, b, c, g = self._setup(client)
        r = client.post(f"/api/groups/{g['id']}/expenses", json={
            "description": "X", "original_amount": "100",
            "original_currency": "INR",
            "paid_by": {str(a["id"]): "100"},
            "split_type": "percentage",
            "split_among": [a["id"], b["id"]],
            "split_details": {str(a["id"]): "60", str(b["id"]): "60"},
            "date": "2025-01-01",
        })
        assert r.status_code == 400


# ════════════════════════════════════════════════════════════════════════════
# BALANCES & SETTLEMENT
# ════════════════════════════════════════════════════════════════════════════

class TestBalances:
    def test_balances_after_single_expense(self, client):
        a = mk_user(client, "Alice", "a@t.com")
        b = mk_user(client, "Bob", "b@t.com")
        g = mk_group(client, members=[a["id"], b["id"]])
        mk_expense(client, g["id"], "Dinner", 100, a["id"], [a["id"], b["id"]])
        r = client.get(f"/api/groups/{g['id']}/balances")
        assert r.status_code == 200
        bals = {x["user_id"]: float(x["balance"]) for x in r.json()["balances"]}
        assert abs(bals[a["id"]] - 50) < 0.01
        assert abs(bals[b["id"]] + 50) < 0.01

    def test_balances_always_sum_to_zero(self, client):
        a = mk_user(client, "Alice", "a@t.com")
        b = mk_user(client, "Bob", "b@t.com")
        c = mk_user(client, "Charlie", "c@t.com")
        g = mk_group(client, members=[a["id"], b["id"], c["id"]])
        mk_expense(client, g["id"], "E1", 300, a["id"], [a["id"], b["id"], c["id"]])
        mk_expense(client, g["id"], "E2", 150, b["id"], [a["id"], b["id"]])
        r = client.get(f"/api/groups/{g['id']}/balances")
        total = sum(float(x["balance"]) for x in r.json()["balances"])
        assert abs(total) < 0.01

    def test_total_check_is_zero(self, client):
        a = mk_user(client, "Alice", "a@t.com")
        b = mk_user(client, "Bob", "b@t.com")
        g = mk_group(client, members=[a["id"], b["id"]])
        mk_expense(client, g["id"], "E", 100, a["id"], [a["id"], b["id"]])
        r = client.get(f"/api/groups/{g['id']}/balances")
        assert float(r.json()["total_check"]) == 0.0

    def test_settlement_plan_correct(self, client):
        a = mk_user(client, "Alice", "a@t.com")
        b = mk_user(client, "Bob", "b@t.com")
        g = mk_group(client, members=[a["id"], b["id"]])
        mk_expense(client, g["id"], "Dinner", 100, a["id"], [a["id"], b["id"]])
        r = client.get(f"/api/groups/{g['id']}/settlement")
        assert r.status_code == 200
        s = r.json()["settlements"]
        assert len(s) == 1
        assert s[0]["from_user_id"] == b["id"]
        assert s[0]["to_user_id"] == a["id"]
        assert abs(float(s[0]["amount"]) - 50) < 0.01

    def test_settlement_cleared_after_payment(self, client):
        a = mk_user(client, "Alice", "a@t.com")
        b = mk_user(client, "Bob", "b@t.com")
        g = mk_group(client, members=[a["id"], b["id"]])
        mk_expense(client, g["id"], "Dinner", 100, a["id"], [a["id"], b["id"]])
        mk_payment(client, g["id"], b["id"], a["id"], 50)
        r = client.get(f"/api/groups/{g['id']}/settlement")
        assert r.json()["settlements"] == []

    def test_pairwise_settlement(self, client):
        a = mk_user(client, "Alice", "a@t.com")
        b = mk_user(client, "Bob", "b@t.com")
        g = mk_group(client, members=[a["id"], b["id"]])
        client.put(f"/api/groups/{g['id']}", json={"simplify_debts": False})
        mk_expense(client, g["id"], "Dinner", 100, a["id"], [a["id"], b["id"]])
        r = client.get(f"/api/groups/{g['id']}/settlement")
        assert r.status_code == 200
        assert len(r.json()["settlements"]) >= 1


# ════════════════════════════════════════════════════════════════════════════
# PAYMENTS
# ════════════════════════════════════════════════════════════════════════════

class TestPayments:
    def test_record_payment(self, client):
        a = mk_user(client, "Alice", "a@t.com")
        b = mk_user(client, "Bob", "b@t.com")
        g = mk_group(client, members=[a["id"], b["id"]])
        r = mk_payment(client, g["id"], b["id"], a["id"], 50)
        assert r["from_user_id"] == b["id"]
        assert r["to_user_id"] == a["id"]
        assert float(r["amount"]) == 50.0

    def test_payment_with_note(self, client):
        a = mk_user(client, "Alice", "a@t.com")
        b = mk_user(client, "Bob", "b@t.com")
        g = mk_group(client, members=[a["id"], b["id"]])
        r = client.post(f"/api/groups/{g['id']}/payments", json={
            "from_user_id": b["id"], "to_user_id": a["id"],
            "amount": "50", "currency": "INR", "date": "2025-01-02",
            "note": "GPay",
        })
        assert r.status_code == 201
        assert r.json()["note"] == "GPay"

    def test_list_payments(self, client):
        a = mk_user(client, "Alice", "a@t.com")
        b = mk_user(client, "Bob", "b@t.com")
        g = mk_group(client, members=[a["id"], b["id"]])
        mk_payment(client, g["id"], b["id"], a["id"], 50)
        mk_payment(client, g["id"], b["id"], a["id"], 30)
        r = client.get(f"/api/groups/{g['id']}/payments")
        assert r.status_code == 200
        assert len(r.json()) == 2


# ════════════════════════════════════════════════════════════════════════════
# INVITES
# ════════════════════════════════════════════════════════════════════════════

class TestInvites:
    def test_create_invite(self, client):
        a = mk_user(client)
        g = mk_group(client, members=[a["id"]], owner_id=a["id"])
        r = client.post(f"/api/invite/groups/{g['id']}/create?actor_user_id={a['id']}")
        assert r.status_code in (200, 201)
        assert "token" in r.json()

    def test_get_invite(self, client):
        a = mk_user(client)
        g = mk_group(client, members=[a["id"]], owner_id=a["id"])
        token = client.post(
            f"/api/invite/groups/{g['id']}/create?actor_user_id={a['id']}"
        ).json()["token"]
        r = client.get(f"/api/invite/{token}")
        assert r.status_code == 200
        assert r.json()["group_id"] == g["id"]

    def test_invalid_token_404(self, client):
        r = client.get("/api/invite/badtoken")
        assert r.status_code == 404

    def test_accept_invite_joins_group(self, client):
        a = mk_user(client, "Alice", "a@t.com")
        b = mk_user(client, "Bob", "b@t.com")
        g = mk_group(client, members=[a["id"]], owner_id=a["id"])
        token = client.post(
            f"/api/invite/groups/{g['id']}/create?actor_user_id={a['id']}"
        ).json()["token"]
        r = client.post(f"/api/invite/{token}/accept", json={"user_id": b["id"]})
        assert r.status_code == 200
        # verify Bob is now a member by fetching the group
        grp = client.get(f"/api/groups/{g['id']}").json()
        assert b["id"] in [m["id"] for m in grp["members"]]

    def test_deactivate_invite(self, client):
        a = mk_user(client)
        g = mk_group(client, members=[a["id"]])
        token = client.post(
            f"/api/invite/groups/{g['id']}/create?actor_user_id={a['id']}"
        ).json()["token"]
        client.delete(f"/api/invite/groups/{g['id']}/invite/{token}")
        r = client.get(f"/api/invite/{token}")
        assert r.status_code in (404, 410)  # deactivated or not found

    def test_already_member_accept_is_ok(self, client):
        a = mk_user(client)
        g = mk_group(client, members=[a["id"]], owner_id=a["id"])
        token = client.post(
            f"/api/invite/groups/{g['id']}/create?actor_user_id={a['id']}"
        ).json()["token"]
        # Alice (already member) accepts — should succeed silently
        r = client.post(f"/api/invite/{token}/accept", json={"user_id": a["id"]})
        assert r.status_code == 200


# ════════════════════════════════════════════════════════════════════════════
# EDIT REQUESTS
# ════════════════════════════════════════════════════════════════════════════

class TestEditRequests:
    def _setup(self, client):
        a = mk_user(client, "Alice", "a@t.com")
        b = mk_user(client, "Bob", "b@t.com")
        g = mk_group(client, members=[a["id"], b["id"]], owner_id=a["id"])
        e = mk_expense(client, g["id"], "Dinner", 100, a["id"], [a["id"], b["id"]])
        return a, b, g, e

    def test_create_edit_request(self, client):
        a, b, g, e = self._setup(client)
        r = client.post(f"/api/expenses/{e['id']}/edit-request", json={
            "requested_by_id": b["id"],
            "proposed_changes": {"description": "Fixed"},
            "message": "Wrong name",
        })
        assert r.status_code == 201
        assert r.json()["status"] == "pending"

    def test_list_edit_requests(self, client):
        a, b, g, e = self._setup(client)
        client.post(f"/api/expenses/{e['id']}/edit-request", json={
            "requested_by_id": b["id"],
            "proposed_changes": {"description": "X"},
        })
        r = client.get(f"/api/groups/{g['id']}/edit-requests")
        assert r.status_code == 200
        assert len(r.json()) == 1

    def test_approve_edit_request(self, client):
        a, b, g, e = self._setup(client)
        er = client.post(f"/api/expenses/{e['id']}/edit-request", json={
            "requested_by_id": b["id"],
            "proposed_changes": {"description": "Fixed"},
        })
        r = client.put(f"/api/edit-requests/{er.json()['id']}/review", json={
            "status": "approved", "actor_user_id": a["id"],
        })
        assert r.status_code == 200
        assert r.json()["status"] == "approved"

    def test_reject_edit_request(self, client):
        a, b, g, e = self._setup(client)
        er = client.post(f"/api/expenses/{e['id']}/edit-request", json={
            "requested_by_id": b["id"],
            "proposed_changes": {"description": "Fixed"},
        })
        r = client.put(f"/api/edit-requests/{er.json()['id']}/review", json={
            "status": "rejected", "actor_user_id": a["id"],
        })
        assert r.status_code == 200
        assert r.json()["status"] == "rejected"


# ════════════════════════════════════════════════════════════════════════════
# ACTIVITY LOG
# ════════════════════════════════════════════════════════════════════════════

class TestActivity:
    def test_group_activity_has_create_on_expense(self, client):
        a = mk_user(client)
        g = mk_group(client, members=[a["id"]])
        mk_expense(client, g["id"], "Dinner", 100, a["id"], [a["id"]])
        r = client.get(f"/api/groups/{g['id']}/activity")
        assert r.status_code == 200
        assert any(x["action_type"] == "create" for x in r.json())

    def test_delete_action_logged(self, client):
        a = mk_user(client)
        g = mk_group(client, members=[a["id"]])
        e = mk_expense(client, g["id"], "X", 100, a["id"], [a["id"]])
        client.delete(f"/api/expenses/{e['id']}?actor_user_id={a['id']}")
        r = client.get(f"/api/groups/{g['id']}/activity")
        assert any(x["action_type"] == "delete" for x in r.json())

    def test_payment_action_logged(self, client):
        a = mk_user(client, "Alice", "a@t.com")
        b = mk_user(client, "Bob", "b@t.com")
        g = mk_group(client, members=[a["id"], b["id"]])
        mk_payment(client, g["id"], b["id"], a["id"], 50)
        r = client.get(f"/api/groups/{g['id']}/activity")
        assert any(x["action_type"] == "payment" for x in r.json())

    def test_user_activity_across_groups(self, client):
        a = mk_user(client)
        g = mk_group(client, members=[a["id"]])
        mk_expense(client, g["id"], "X", 100, a["id"], [a["id"]])
        r = client.get(f"/api/users/{a['id']}/activity")
        assert r.status_code == 200
        assert len(r.json()) > 0


# ════════════════════════════════════════════════════════════════════════════
# FRIEND (GROUP-LESS) EXPENSES
# ════════════════════════════════════════════════════════════════════════════

class TestFriendExpenses:
    def test_create_friend_expense(self, client):
        a = mk_user(client, "Alice", "a@t.com")
        b = mk_user(client, "Bob", "b@t.com")
        r = client.post("/api/friend-expenses", json={
            "description": "Coffee",
            "original_amount": "100",
            "original_currency": "INR",
            "payer_user_id": a["id"],
            "other_user_id": b["id"],
            "date": "2025-01-01",
        })
        assert r.status_code == 201
        assert r.json()["group_id"] is None

    def test_self_expense_rejected(self, client):
        a = mk_user(client)
        r = client.post("/api/friend-expenses", json={
            "description": "X", "original_amount": "50",
            "original_currency": "INR",
            "payer_user_id": a["id"], "other_user_id": a["id"],
            "date": "2025-01-01",
        })
        assert r.status_code == 400

    def test_list_friend_expenses(self, client):
        a = mk_user(client, "Alice", "a@t.com")
        b = mk_user(client, "Bob", "b@t.com")
        client.post("/api/friend-expenses", json={
            "description": "C1", "original_amount": "100",
            "original_currency": "INR",
            "payer_user_id": a["id"], "other_user_id": b["id"],
            "date": "2025-01-01",
        })
        r = client.get(f"/api/users/{a['id']}/friend-expenses")
        assert r.status_code == 200
        assert len(r.json()) == 1
