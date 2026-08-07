from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models import Expense, Group, User, ActivityLog, ActionType, EntityType, SplitType
from schemas import ExpenseCreate, ExpenseUpdate, ExpenseOut, DuplicateWarning, FriendExpenseCreate
from services.split_calculator import calculate_split, quantum

router = APIRouter(tags=["expenses"], dependencies=[Depends(get_current_user)])


def _get_group(group_id: int, db: Session) -> Group:
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(404, "Group not found.")
    return group


def _validate_members(group: Group, user_ids: List[int]):
    member_ids = {m.id for m in group.members}
    bad = set(user_ids) - member_ids
    if bad:
        raise HTTPException(400, f"User IDs {sorted(bad)} are not members of this group.")


def _convert_paid_by(paid_by: dict, fx_rate: Decimal) -> dict:
    """Convert paid_by amounts from expense currency to group currency."""
    return {str(k): str(Decimal(str(v)) * fx_rate) for k, v in paid_by.items()}


def _build_expense_from_create(
    body: ExpenseCreate, group: Group, db: Session
) -> Expense:
    currency = group.currency
    original_currency = body.original_currency.upper()
    fx_rate = body.fx_rate

    if original_currency != currency:
        if fx_rate == Decimal("1") or fx_rate <= 0:
            raise HTTPException(
                400,
                f"Expense currency {original_currency} differs from group currency "
                f"{currency}. Provide a valid fx_rate (rate from {original_currency} to {currency}).",
            )

    total_in_group_currency = body.original_amount * fx_rate

    # Validate paid_by
    paid_by_user_ids = [int(k) for k in body.paid_by.keys()]
    _validate_members(group, paid_by_user_ids)
    _validate_members(group, body.split_among)

    paid_by_sum = sum(Decimal(str(v)) for v in body.paid_by.values())
    if abs(paid_by_sum - body.original_amount) > quantum(original_currency):
        raise HTTPException(
            400,
            f"paid_by amounts sum to {paid_by_sum} {original_currency}, "
            f"but expense total is {body.original_amount} {original_currency}.",
        )

    # Calculate split
    split_amounts, split_raw, err = calculate_split(
        total=total_in_group_currency,
        currency=currency,
        split_type=body.split_type.value,
        split_among=body.split_among,
        split_details=body.split_details,
    )
    if err:
        raise HTTPException(400, err)

    # Convert paid_by to group currency
    paid_by_converted = _convert_paid_by(body.paid_by, fx_rate)

    exp = Expense(
        description=body.description,
        original_amount=body.original_amount,
        original_currency=original_currency,
        fx_rate=fx_rate,
        total_amount=total_in_group_currency,
        paid_by=paid_by_converted,
        split_type=body.split_type,
        split_amounts={str(k): str(v) for k, v in split_amounts.items()},
        split_raw={str(k): str(v) for k, v in split_raw.items()} if split_raw else None,
        category=body.category,
        date=body.date,
        is_negative=body.is_negative,
        recurrence_rule=body.recurrence_rule,
        recurrence_end_date=body.recurrence_end_date,
    )
    return exp


# ── Group Expenses ─────────────────────────────────────────────────────────

@router.post("/api/groups/{group_id}/expenses", response_model=ExpenseOut, status_code=201)
def create_expense(group_id: int, body: ExpenseCreate, db: Session = Depends(get_db)):
    group = _get_group(group_id, db)
    if group.archived:
        raise HTTPException(400, "Cannot add expenses to an archived group.")

    exp = _build_expense_from_create(body, group, db)
    exp.group_id = group_id
    db.add(exp)
    db.flush()

    # Generate recurring instances if needed
    if body.recurrence_rule and body.recurrence_rule != "none":
        _generate_recurring(exp, group, db)

    db.add(ActivityLog(
        group_id=group_id,
        actor_user_id=body.actor_user_id,
        action_type=ActionType.CREATE,
        entity_type=EntityType.EXPENSE,
        entity_id=exp.id,
        details={
            "description": exp.description,
            "amount": str(exp.total_amount),
            "currency": group.currency,
        },
    ))
    db.commit()
    db.refresh(exp)
    return _expense_out(exp)


def _generate_recurring(parent: Expense, group: Group, db: Session):
    from dateutil.relativedelta import relativedelta
    rule = parent.recurrence_rule
    current_date = parent.date
    end_date = parent.recurrence_end_date

    deltas = {"monthly": relativedelta(months=1), "weekly": timedelta(weeks=1)}
    delta = deltas.get(rule)
    if not delta:
        return

    instances = []
    next_date = current_date + delta
    while end_date and next_date <= end_date:
        child = Expense(
            group_id=parent.group_id,
            description=parent.description,
            original_amount=parent.original_amount,
            original_currency=parent.original_currency,
            fx_rate=parent.fx_rate,
            total_amount=parent.total_amount,
            paid_by=parent.paid_by,
            split_type=parent.split_type,
            split_amounts=parent.split_amounts,
            split_raw=parent.split_raw,
            category=parent.category,
            date=next_date,
            is_negative=parent.is_negative,
            parent_expense_id=parent.id,
        )
        instances.append(child)
        next_date = next_date + delta
        if len(instances) >= 24:  # safety cap
            break
    db.add_all(instances)


@router.get("/api/groups/{group_id}/expenses", response_model=List[ExpenseOut])
def list_expenses(
    group_id: int,
    include_deleted: bool = False,
    db: Session = Depends(get_db),
):
    _get_group(group_id, db)
    q = db.query(Expense).filter(Expense.group_id == group_id)
    if not include_deleted:
        q = q.filter(Expense.deleted == False)
    expenses = q.order_by(Expense.date.desc(), Expense.created_at.desc()).all()
    return [_expense_out(e) for e in expenses]


@router.get("/api/expenses/{expense_id}", response_model=ExpenseOut)
def get_expense(expense_id: int, db: Session = Depends(get_db)):
    exp = db.query(Expense).filter(Expense.id == expense_id).first()
    if not exp:
        raise HTTPException(404, "Expense not found.")
    return _expense_out(exp)


@router.put("/api/expenses/{expense_id}", response_model=ExpenseOut)
def update_expense(expense_id: int, body: ExpenseUpdate, db: Session = Depends(get_db)):
    exp = db.query(Expense).filter(Expense.id == expense_id).first()
    if not exp or exp.deleted:
        raise HTTPException(404, "Expense not found.")

    group = exp.group
    if group and group.archived:
        raise HTTPException(400, "Cannot edit expenses in an archived group.")

    # Capture before-state for audit log
    before = {
        "description": exp.description,
        "total_amount": str(exp.total_amount),
        "split_type": exp.split_type.value,
    }

    if body.description is not None:
        exp.description = body.description
    if body.category is not None:
        exp.category = body.category
    if body.date is not None:
        exp.date = body.date
    if body.is_negative is not None:
        exp.is_negative = body.is_negative

    # If financial fields change, recalculate everything
    if any(f is not None for f in [
        body.original_amount, body.original_currency, body.fx_rate,
        body.paid_by, body.split_type, body.split_among, body.split_details
    ]):
        currency = group.currency if group else exp.original_currency
        original_amount = body.original_amount if body.original_amount is not None else exp.original_amount
        original_currency = (body.original_currency or exp.original_currency).upper()
        fx_rate = body.fx_rate if body.fx_rate is not None else exp.fx_rate
        total = original_amount * fx_rate

        paid_by_raw = body.paid_by if body.paid_by is not None else {
            k: Decimal(str(v)) for k, v in exp.paid_by.items()
        }
        split_type = body.split_type if body.split_type is not None else exp.split_type
        split_among = body.split_among
        if split_among is None:
            split_among = [int(k) for k in exp.split_amounts.keys()]

        if group:
            _validate_members(group, [int(k) for k in paid_by_raw.keys()])
            _validate_members(group, split_among)

        split_details = body.split_details
        split_amounts, split_raw, err = calculate_split(
            total=total,
            currency=currency,
            split_type=split_type.value,
            split_among=split_among,
            split_details=split_details,
        )
        if err:
            raise HTTPException(400, err)

        exp.original_amount = original_amount
        exp.original_currency = original_currency
        exp.fx_rate = fx_rate
        exp.total_amount = total
        exp.paid_by = _convert_paid_by(paid_by_raw, fx_rate)
        exp.split_type = split_type
        exp.split_amounts = {str(k): str(v) for k, v in split_amounts.items()}
        exp.split_raw = {str(k): str(v) for k, v in split_raw.items()} if split_raw else None

    exp.updated_at = datetime.utcnow()

    if group:
        db.add(ActivityLog(
            group_id=group.id,
            actor_user_id=body.actor_user_id,
            action_type=ActionType.EDIT,
            entity_type=EntityType.EXPENSE,
            entity_id=exp.id,
            details={"before": before, "description": exp.description, "amount": str(exp.total_amount)},
        ))
    db.commit()
    db.refresh(exp)
    return _expense_out(exp)


@router.delete("/api/expenses/{expense_id}", status_code=204)
def delete_expense(
    expense_id: int,
    actor_user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    exp = db.query(Expense).filter(Expense.id == expense_id).first()
    if not exp or exp.deleted:
        raise HTTPException(404, "Expense not found.")

    exp.deleted = True
    exp.deleted_at = datetime.utcnow()

    if exp.group_id:
        db.add(ActivityLog(
            group_id=exp.group_id,
            actor_user_id=actor_user_id,
            action_type=ActionType.DELETE,
            entity_type=EntityType.EXPENSE,
            entity_id=exp.id,
            details={"description": exp.description, "amount": str(exp.total_amount)},
        ))
    db.commit()


@router.get("/api/groups/{group_id}/expenses/check-duplicate", response_model=DuplicateWarning)
def check_duplicate(
    group_id: int,
    description: str,
    amount: float,
    payer_id: int,
    db: Session = Depends(get_db),
):
    _get_group(group_id, db)
    window = datetime.utcnow() - timedelta(minutes=5)
    candidates = (
        db.query(Expense)
        .filter(
            Expense.group_id == group_id,
            Expense.deleted == False,
            Expense.description == description,
            Expense.created_at >= window,
        )
        .all()
    )
    for exp in candidates:
        if (
            abs(float(exp.original_amount) - amount) < 0.01
            and str(payer_id) in exp.paid_by
        ):
            return DuplicateWarning(
                is_duplicate=True,
                matching_expense_id=exp.id,
                message=f'An identical expense "{description}" for {amount} was added in the last 5 minutes. Did you mean to add it twice?',
            )
    return DuplicateWarning(is_duplicate=False, matching_expense_id=None, message=None)


# ── Friend (group-less) Expenses ───────────────────────────────────────────

@router.post("/api/friend-expenses", response_model=ExpenseOut, status_code=201)
def create_friend_expense(body: FriendExpenseCreate, db: Session = Depends(get_db)):
    for uid in [body.payer_user_id, body.other_user_id]:
        if not db.query(User).filter(User.id == uid).first():
            raise HTTPException(404, f"User {uid} not found.")

    if body.payer_user_id == body.other_user_id:
        raise HTTPException(400, "Cannot split an expense with yourself.")

    amount = body.original_amount
    if amount <= 0:
        raise HTTPException(400, "Amount must be positive.")

    half = (amount / 2).quantize(Decimal("0.01"))
    other_half = amount - half

    exp = Expense(
        group_id=None,
        description=body.description,
        original_amount=amount,
        original_currency=body.original_currency,
        fx_rate=Decimal("1"),
        total_amount=amount,
        paid_by={str(body.payer_user_id): str(amount)},
        split_type=SplitType.EXACT,
        split_amounts={
            str(body.payer_user_id): str(half),
            str(body.other_user_id): str(other_half),
        },
        split_raw=None,
        category=body.category,
        date=body.date,
    )
    db.add(exp)
    db.commit()
    db.refresh(exp)
    return _expense_out(exp)


@router.get("/api/users/{user_id}/friend-expenses", response_model=List[ExpenseOut])
def list_friend_expenses(user_id: int, db: Session = Depends(get_db)):
    if not db.query(User).filter(User.id == user_id).first():
        raise HTTPException(404, "User not found.")
    expenses = (
        db.query(Expense)
        .filter(Expense.group_id.is_(None), Expense.deleted == False)
        .all()
    )
    uid_str = str(user_id)
    result = [
        e for e in expenses
        if uid_str in e.paid_by or uid_str in e.split_amounts
    ]
    return [_expense_out(e) for e in result]


# ── Helper ─────────────────────────────────────────────────────────────────

def _expense_out(exp: Expense) -> ExpenseOut:
    return ExpenseOut(
        id=exp.id,
        group_id=exp.group_id,
        description=exp.description,
        original_amount=str(exp.original_amount),
        original_currency=exp.original_currency,
        fx_rate=str(exp.fx_rate),
        total_amount=str(exp.total_amount),
        paid_by={k: str(v) for k, v in exp.paid_by.items()},
        split_type=exp.split_type,
        split_amounts={k: str(v) for k, v in exp.split_amounts.items()},
        split_raw={k: str(v) for k, v in exp.split_raw.items()} if exp.split_raw else None,
        category=exp.category,
        date=exp.date,
        created_at=exp.created_at,
        updated_at=exp.updated_at,
        deleted=exp.deleted,
        is_negative=exp.is_negative,
        recurrence_rule=exp.recurrence_rule,
        recurrence_end_date=exp.recurrence_end_date,
        parent_expense_id=exp.parent_expense_id,
    )
