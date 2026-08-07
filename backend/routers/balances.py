from decimal import Decimal
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models import Group, User
from schemas import GroupBalances, UserBalance, SettlementPlan, SettlementItem
from services.balance_calculator import compute_net_balances, compute_pairwise_balances
from services.debt_simplifier import simplify_debts

router = APIRouter(tags=["balances"], dependencies=[Depends(get_current_user)])


def _get_group(group_id: int, db: Session) -> Group:
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(404, "Group not found.")
    return group


def _user_map(group: Group) -> dict:
    return {m.id: m.name for m in group.members}


@router.get("/api/groups/{group_id}/balances", response_model=GroupBalances)
def group_balances(group_id: int, db: Session = Depends(get_db)):
    group = _get_group(group_id, db)
    members = group.members

    if len(members) <= 1:
        return GroupBalances(
            group_id=group_id,
            currency=group.currency,
            balances=[
                UserBalance(user_id=m.id, user_name=m.name, balance="0.00")
                for m in members
            ],
            total_check="0.00",
        )

    balances = compute_net_balances(group.expenses, group.payments)
    user_names = _user_map(group)

    # Include all members (even those with 0 balance)
    all_member_ids = {m.id for m in members}
    result: List[UserBalance] = []
    for uid in sorted(all_member_ids):
        bal = balances.get(uid, Decimal("0"))
        result.append(UserBalance(
            user_id=uid,
            user_name=user_names.get(uid, str(uid)),
            balance=str(bal.quantize(Decimal("0.01"))),
        ))

    total = sum(balances.values()) if balances else Decimal("0")
    return GroupBalances(
        group_id=group_id,
        currency=group.currency,
        balances=result,
        total_check=str(total.quantize(Decimal("0.01"))),
    )


@router.get("/api/groups/{group_id}/settlement", response_model=SettlementPlan)
def settlement_plan(group_id: int, db: Session = Depends(get_db)):
    group = _get_group(group_id, db)
    user_names = _user_map(group)

    if len(group.members) <= 1:
        return SettlementPlan(
            group_id=group_id,
            currency=group.currency,
            simplify_debts=group.simplify_debts,
            settlements=[],
        )

    settlements: List[SettlementItem] = []

    if group.simplify_debts:
        balances = compute_net_balances(group.expenses, group.payments)
        raw_settlements = simplify_debts(balances)
        for from_uid, to_uid, amount in raw_settlements:
            settlements.append(SettlementItem(
                from_user_id=from_uid,
                from_user_name=user_names.get(from_uid, str(from_uid)),
                to_user_id=to_uid,
                to_user_name=user_names.get(to_uid, str(to_uid)),
                amount=str(amount.quantize(Decimal("0.01"))),
                currency=group.currency,
            ))
    else:
        pairwise = compute_pairwise_balances(group.expenses, group.payments)
        for (from_uid, to_uid), amount in sorted(pairwise.items()):
            settlements.append(SettlementItem(
                from_user_id=from_uid,
                from_user_name=user_names.get(from_uid, str(from_uid)),
                to_user_id=to_uid,
                to_user_name=user_names.get(to_uid, str(to_uid)),
                amount=str(amount.quantize(Decimal("0.01"))),
                currency=group.currency,
            ))

    return SettlementPlan(
        group_id=group_id,
        currency=group.currency,
        simplify_debts=group.simplify_debts,
        settlements=settlements,
    )
