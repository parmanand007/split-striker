from datetime import datetime, date
from decimal import Decimal
from typing import Optional, Dict, List, Any
from pydantic import BaseModel, field_validator, model_validator, ConfigDict

from models import SplitType, ActionType, EntityType


def _d(v: Any) -> Decimal:
    return Decimal(str(v))


class DecimalModel(BaseModel):
    model_config = ConfigDict(json_encoders={Decimal: str})


# ── Users ──────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    name: str
    email: str

class LoginByEmail(BaseModel):
    email: str


class UserOut(BaseModel):
    id: int
    name: str
    email: Optional[str]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class UserSummary(BaseModel):
    user: UserOut
    # per-currency totals across all groups + friend expenses
    total_owed: Dict[str, str]   # currency -> amount (positive = others owe you)
    total_owing: Dict[str, str]  # currency -> amount (positive = you owe others)
    group_balances: List[Dict]


# ── Groups ─────────────────────────────────────────────────────────────────

class GroupCreate(BaseModel):
    name: str
    currency: str = "INR"
    member_ids: List[int] = []
    simplify_debts: bool = True
    created_by_id: Optional[int] = None
    emoji: Optional[str] = None

    @field_validator("currency")
    @classmethod
    def upper_currency(cls, v: str) -> str:
        return v.upper()


class GroupUpdate(BaseModel):
    name: Optional[str] = None
    archived: Optional[bool] = None
    simplify_debts: Optional[bool] = None
    emoji: Optional[str] = None


class GroupOut(BaseModel):
    id: int
    name: str
    currency: str
    archived: bool
    simplify_debts: bool
    created_by_id: Optional[int] = None
    emoji: Optional[str] = None
    created_at: datetime
    members: List[UserOut]
    model_config = ConfigDict(from_attributes=True)


class AddMemberRequest(BaseModel):
    user_id: int


# ── Expenses ───────────────────────────────────────────────────────────────

class ExpenseCreate(BaseModel):
    description: str
    original_amount: Decimal
    original_currency: str
    fx_rate: Decimal = Decimal("1")
    paid_by: Dict[str, Decimal]          # {user_id_str: amount in original currency}
    split_type: SplitType
    split_among: List[int]               # user IDs who participate in split
    split_details: Optional[Dict[str, Decimal]] = None  # for exact/percentage/shares
    category: Optional[str] = None
    date: date
    is_negative: bool = False
    recurrence_rule: Optional[str] = None
    recurrence_end_date: Optional[date] = None
    actor_user_id: Optional[int] = None  # for activity log

    @field_validator("original_currency")
    @classmethod
    def upper_currency(cls, v: str) -> str:
        return v.upper()

    @model_validator(mode="after")
    def validate_amounts(self) -> "ExpenseCreate":
        total = self.original_amount
        if not self.is_negative and total <= 0:
            raise ValueError("Expense amount must be positive. Use is_negative=true for refunds.")
        if self.is_negative and total >= 0:
            raise ValueError("Refund/negative expense must have a negative original_amount.")
        return self


class ExpenseUpdate(BaseModel):
    description: Optional[str] = None
    original_amount: Optional[Decimal] = None
    original_currency: Optional[str] = None
    fx_rate: Optional[Decimal] = None
    paid_by: Optional[Dict[str, Decimal]] = None
    split_type: Optional[SplitType] = None
    split_among: Optional[List[int]] = None
    split_details: Optional[Dict[str, Decimal]] = None
    category: Optional[str] = None
    date: Optional[date] = None
    is_negative: Optional[bool] = None
    actor_user_id: Optional[int] = None


class ExpenseOut(BaseModel):
    id: int
    group_id: Optional[int]
    description: str
    original_amount: str
    original_currency: str
    fx_rate: str
    total_amount: str
    paid_by: Dict[str, str]
    split_type: SplitType
    split_amounts: Dict[str, str]
    split_raw: Optional[Dict[str, str]]
    category: Optional[str]
    date: date
    created_at: datetime
    updated_at: Optional[datetime]
    deleted: bool
    is_negative: bool
    recurrence_rule: Optional[str]
    recurrence_end_date: Optional[date]
    parent_expense_id: Optional[int]
    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def coerce_decimals(self) -> "ExpenseOut":
        self.original_amount = str(self.original_amount)
        self.fx_rate = str(self.fx_rate)
        self.total_amount = str(self.total_amount)
        return self


# ── Payments ───────────────────────────────────────────────────────────────

class PaymentCreate(BaseModel):
    from_user_id: int
    to_user_id: int
    amount: Decimal
    currency: str
    date: date
    note: Optional[str] = None
    actor_user_id: Optional[int] = None

    @field_validator("currency")
    @classmethod
    def upper_currency(cls, v: str) -> str:
        return v.upper()


class PaymentOut(BaseModel):
    id: int
    group_id: Optional[int]
    from_user_id: int
    to_user_id: int
    from_user: UserOut
    to_user: UserOut
    amount: str
    currency: str
    date: date
    note: Optional[str]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def coerce_decimal(self) -> "PaymentOut":
        self.amount = str(self.amount)
        return self


# ── Balances & Settlement ──────────────────────────────────────────────────

class UserBalance(BaseModel):
    user_id: int
    user_name: str
    balance: str  # positive = owed by others, negative = owes others


class GroupBalances(BaseModel):
    group_id: int
    currency: str
    balances: List[UserBalance]
    total_check: str  # should be "0.00"


class SettlementItem(BaseModel):
    from_user_id: int
    from_user_name: str
    to_user_id: int
    to_user_name: str
    amount: str
    currency: str


class SettlementPlan(BaseModel):
    group_id: int
    currency: str
    simplify_debts: bool
    settlements: List[SettlementItem]


# ── Activity ───────────────────────────────────────────────────────────────

class ActivityLogOut(BaseModel):
    id: int
    group_id: Optional[int]
    actor_user_id: Optional[int]
    actor_name: Optional[str]
    action_type: ActionType
    entity_type: EntityType
    entity_id: Optional[int]
    details: Optional[dict]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ── Friend Expenses ────────────────────────────────────────────────────────

class FriendExpenseCreate(BaseModel):
    description: str
    original_amount: Decimal
    original_currency: str
    payer_user_id: int
    other_user_id: int
    category: Optional[str] = None
    date: date
    actor_user_id: Optional[int] = None

    @field_validator("original_currency")
    @classmethod
    def upper_currency(cls, v: str) -> str:
        return v.upper()


# ── Duplicate Check ────────────────────────────────────────────────────────

class DuplicateWarning(BaseModel):
    is_duplicate: bool
    matching_expense_id: Optional[int]
    message: Optional[str]
