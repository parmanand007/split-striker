from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models import Group, User, Expense, Payment, ActivityLog, ActionType, EntityType
from schemas import GroupCreate, GroupOut, GroupUpdate, AddMemberRequest

router = APIRouter(prefix="/api/groups", tags=["groups"], dependencies=[Depends(get_current_user)])


def _get_group(group_id: int, db: Session) -> Group:
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(404, "Group not found.")
    return group


@router.post("", response_model=GroupOut, status_code=201)
def create_group(body: GroupCreate, db: Session = Depends(get_db)):
    group = Group(
        name=body.name,
        currency=body.currency.upper(),
        simplify_debts=body.simplify_debts,
        created_by_id=body.created_by_id,
        emoji=body.emoji,
    )
    db.add(group)
    db.flush()

    for uid in body.member_ids:
        user = db.query(User).filter(User.id == uid).first()
        if not user:
            raise HTTPException(404, f"User {uid} not found.")
        group.members.append(user)

    db.add(ActivityLog(
        group_id=group.id,
        actor_user_id=body.created_by_id,
        action_type=ActionType.CREATE,
        entity_type=EntityType.GROUP,
        entity_id=group.id,
        details={"name": group.name, "currency": group.currency},
    ))
    db.commit()
    db.refresh(group)
    return group


@router.get("", response_model=List[GroupOut])
def list_groups(
    user_id: int = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # In production: always scope to the JWT user (ignore user_id param).
    # In tests: current_user is None (bypassed), so user_id param is the fallback.
    filter_id = current_user.id if current_user is not None else user_id
    if not filter_id:
        return []
    return (
        db.query(Group)
        .filter(Group.members.any(User.id == filter_id))
        .order_by(Group.created_at.desc())
        .all()
    )


@router.get("/{group_id}", response_model=GroupOut)
def get_group(group_id: int, db: Session = Depends(get_db)):
    return _get_group(group_id, db)


@router.put("/{group_id}", response_model=GroupOut)
def update_group(group_id: int, body: GroupUpdate, db: Session = Depends(get_db)):
    group = _get_group(group_id, db)
    if body.name is not None:
        group.name = body.name
    if body.archived is not None:
        group.archived = body.archived
    if body.simplify_debts is not None:
        group.simplify_debts = body.simplify_debts
    if body.emoji is not None:
        group.emoji = body.emoji
    db.add(ActivityLog(
        group_id=group.id,
        action_type=ActionType.EDIT,
        entity_type=EntityType.GROUP,
        entity_id=group.id,
        details=body.model_dump(exclude_none=True),
    ))
    db.commit()
    db.refresh(group)
    return group


@router.delete("/{group_id}", status_code=204)
def delete_group(group_id: int, actor_user_id: int, db: Session = Depends(get_db)):
    group = _get_group(group_id, db)
    if group.created_by_id != actor_user_id:
        raise HTTPException(403, "Only the group owner can delete this group.")
    # Remove child records manually (group_id is SET NULL for expenses/payments)
    db.query(Expense).filter(Expense.group_id == group_id).delete(synchronize_session=False)
    db.query(Payment).filter(Payment.group_id == group_id).delete(synchronize_session=False)
    db.query(ActivityLog).filter(ActivityLog.group_id == group_id).delete(synchronize_session=False)
    db.delete(group)
    db.commit()


@router.post("/{group_id}/members", response_model=GroupOut)
def add_member(group_id: int, body: AddMemberRequest, db: Session = Depends(get_db)):
    group = _get_group(group_id, db)
    if group.archived:
        raise HTTPException(400, "Cannot add members to an archived group.")
    user = db.query(User).filter(User.id == body.user_id).first()
    if not user:
        raise HTTPException(404, f"User {body.user_id} not found.")
    if user in group.members:
        raise HTTPException(400, f"{user.name} is already a member of this group.")
    group.members.append(user)
    db.add(ActivityLog(
        group_id=group.id,
        actor_user_id=body.user_id,
        action_type=ActionType.MEMBER_ADD,
        entity_type=EntityType.MEMBER,
        entity_id=user.id,
        details={"user_name": user.name},
    ))
    db.commit()
    db.refresh(group)
    return group


@router.delete("/{group_id}/members/{user_id}", response_model=GroupOut)
def remove_member(group_id: int, user_id: int, db: Session = Depends(get_db)):
    from services.balance_calculator import compute_net_balances
    from decimal import Decimal

    group = _get_group(group_id, db)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found.")
    if user not in group.members:
        raise HTTPException(400, "User is not a member of this group.")

    # Block removal if the user has a nonzero balance
    balances = compute_net_balances(group.expenses, group.payments)
    user_bal = balances.get(user_id, Decimal("0"))
    if abs(user_bal) > Decimal("0.005"):
        raise HTTPException(
            400,
            f"{user.name} has a nonzero balance of {user_bal} {group.currency}. "
            "Settle all debts before removing from the group.",
        )

    group.members.remove(user)
    db.add(ActivityLog(
        group_id=group.id,
        actor_user_id=user_id,
        action_type=ActionType.MEMBER_REMOVE,
        entity_type=EntityType.MEMBER,
        entity_id=user.id,
        details={"user_name": user.name},
    ))
    db.commit()
    db.refresh(group)
    return group
