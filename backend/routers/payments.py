from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Payment, Group, User, ActivityLog, ActionType, EntityType
from schemas import PaymentCreate, PaymentOut

router = APIRouter(tags=["payments"])


def _payment_out(p: Payment) -> PaymentOut:
    from schemas import UserOut
    return PaymentOut(
        id=p.id,
        group_id=p.group_id,
        from_user_id=p.from_user_id,
        to_user_id=p.to_user_id,
        from_user=UserOut.model_validate(p.from_user),
        to_user=UserOut.model_validate(p.to_user),
        amount=str(p.amount),
        currency=p.currency,
        date=p.date,
        note=p.note,
        created_at=p.created_at,
    )


@router.post("/api/groups/{group_id}/payments", response_model=PaymentOut, status_code=201)
def record_payment(group_id: int, body: PaymentCreate, db: Session = Depends(get_db)):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(404, "Group not found.")
    if group.archived:
        raise HTTPException(400, "Cannot record payments in an archived group.")

    member_ids = {m.id for m in group.members}
    for uid in [body.from_user_id, body.to_user_id]:
        if uid not in member_ids:
            raise HTTPException(400, f"User {uid} is not a member of this group.")

    if body.from_user_id == body.to_user_id:
        raise HTTPException(400, "Cannot record a payment to yourself.")

    if body.amount <= 0:
        raise HTTPException(400, "Payment amount must be positive.")

    payment = Payment(
        group_id=group_id,
        from_user_id=body.from_user_id,
        to_user_id=body.to_user_id,
        amount=body.amount,
        currency=body.currency.upper(),
        date=body.date,
        note=body.note,
    )
    db.add(payment)
    db.flush()

    from_user = db.query(User).filter(User.id == body.from_user_id).first()
    to_user = db.query(User).filter(User.id == body.to_user_id).first()

    db.add(ActivityLog(
        group_id=group_id,
        actor_user_id=body.actor_user_id,
        action_type=ActionType.PAYMENT,
        entity_type=EntityType.PAYMENT,
        entity_id=payment.id,
        details={
            "from_user": from_user.name if from_user else str(body.from_user_id),
            "to_user": to_user.name if to_user else str(body.to_user_id),
            "amount": str(body.amount),
            "currency": body.currency.upper(),
            "note": body.note,
        },
    ))
    db.commit()
    db.refresh(payment)
    return _payment_out(payment)


@router.get("/api/groups/{group_id}/payments", response_model=List[PaymentOut])
def list_payments(group_id: int, db: Session = Depends(get_db)):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(404, "Group not found.")
    payments = (
        db.query(Payment)
        .filter(Payment.group_id == group_id)
        .order_by(Payment.date.desc(), Payment.created_at.desc())
        .all()
    )
    return [_payment_out(p) for p in payments]
