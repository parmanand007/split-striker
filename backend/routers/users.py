from collections import defaultdict
from decimal import Decimal
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database import get_db
from models import User, Group, Expense, Payment
from schemas import UserCreate, UserOut, UserSummary, LoginByEmail
from services.balance_calculator import compute_net_balances

router = APIRouter(prefix="/api/users", tags=["users"])


@router.post("/login", response_model=UserOut)
def login_by_email(body: LoginByEmail, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email.strip().lower()).first()
    if not user:
        raise HTTPException(404, "No account found with this email.")
    return user

@router.post("", response_model=UserOut, status_code=201)
def create_user(body: UserCreate, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(400, "An account with this email already exists.")
    user = User(name=body.name, email=email)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("", response_model=List[UserOut])
def list_users(db: Session = Depends(get_db)):
    return db.query(User).order_by(User.name).all()


@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found.")
    return user


@router.get("/{user_id}/summary", response_model=UserSummary)
def user_summary(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found.")

    total_owed: dict[str, Decimal] = defaultdict(Decimal)
    total_owing: dict[str, Decimal] = defaultdict(Decimal)
    group_balances = []

    for group in user.groups:
        expenses = group.expenses
        payments = group.payments
        balances = compute_net_balances(expenses, payments)
        user_bal = balances.get(user_id, Decimal("0"))
        currency = group.currency

        if user_bal > 0:
            total_owed[currency] += user_bal
        elif user_bal < 0:
            total_owing[currency] += abs(user_bal)

        group_balances.append({
            "group_id": group.id,
            "group_name": group.name,
            "currency": currency,
            "balance": str(user_bal),
        })

    # Friend (group-less) expenses
    friend_expenses = (
        db.query(Expense)
        .filter(Expense.group_id.is_(None), Expense.deleted == False)
        .all()
    )
    friend_payments = (
        db.query(Payment)
        .filter(
            Payment.group_id.is_(None),
            or_(Payment.from_user_id == user_id, Payment.to_user_id == user_id),
        )
        .all()
    )
    # Filter to expenses involving this user
    my_friend_expenses = [
        e for e in friend_expenses
        if str(user_id) in e.paid_by or user_id in [int(k) for k in e.split_amounts]
    ]
    if my_friend_expenses or friend_payments:
        friend_balances = compute_net_balances(my_friend_expenses, friend_payments)
        friend_bal = friend_balances.get(user_id, Decimal("0"))
        # friend expenses use each expense's original_currency; aggregate by currency
        # For simplicity, group-less expenses are tracked as USD or the stored currency
        # We aggregate per currency of the expense
        for exp in my_friend_expenses:
            exp_bal_map = compute_net_balances([exp], [])
            exp_user_bal = exp_bal_map.get(user_id, Decimal("0"))
            cur = exp.original_currency
            if exp_user_bal > 0:
                total_owed[cur] += exp_user_bal
            elif exp_user_bal < 0:
                total_owing[cur] += abs(exp_user_bal)

    return UserSummary(
        user=UserOut.model_validate(user),
        total_owed={k: str(v) for k, v in total_owed.items()},
        total_owing={k: str(v) for k, v in total_owing.items()},
        group_balances=group_balances,
    )
