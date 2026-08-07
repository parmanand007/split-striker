from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from dependencies import get_current_user
from models import (
    EditRequest, EditRequestStatus, Expense, Group, User,
    ActivityLog, ActionType, EntityType,
)

router = APIRouter(prefix="/api", tags=["edit-requests"], dependencies=[Depends(get_current_user)])


class EditRequestCreate(BaseModel):
    requested_by_id: int
    proposed_changes: dict
    message: Optional[str] = None


class EditRequestOut(BaseModel):
    id: int
    group_id: int
    expense_id: int
    expense_description: str
    requested_by_id: int
    requested_by_name: str
    proposed_changes: dict
    message: Optional[str]
    status: EditRequestStatus
    reviewed_by_id: Optional[int]
    reviewed_by_name: Optional[str]
    reviewed_at: Optional[datetime]
    created_at: datetime


class ReviewBody(BaseModel):
    status: EditRequestStatus  # approved or rejected
    actor_user_id: int


def _to_out(er: EditRequest) -> EditRequestOut:
    return EditRequestOut(
        id=er.id,
        group_id=er.group_id,
        expense_id=er.expense_id,
        expense_description=er.expense.description if er.expense else "",
        requested_by_id=er.requested_by_id,
        requested_by_name=er.requested_by.name if er.requested_by else "Unknown",
        proposed_changes=er.proposed_changes,
        message=er.message,
        status=er.status,
        reviewed_by_id=er.reviewed_by_id,
        reviewed_by_name=er.reviewed_by.name if er.reviewed_by else None,
        reviewed_at=er.reviewed_at,
        created_at=er.created_at,
    )


@router.post("/expenses/{expense_id}/edit-request", response_model=EditRequestOut, status_code=201)
def create_edit_request(
    expense_id: int, body: EditRequestCreate, db: Session = Depends(get_db)
):
    expense = db.query(Expense).filter(Expense.id == expense_id, Expense.deleted == False).first()
    if not expense:
        raise HTTPException(404, "Expense not found.")

    user = db.query(User).filter(User.id == body.requested_by_id).first()
    if not user:
        raise HTTPException(404, "User not found.")

    group = db.query(Group).filter(Group.id == expense.group_id).first()
    if not group:
        raise HTTPException(404, "Group not found.")

    # Check not already owner
    if group.created_by_id == body.requested_by_id:
        raise HTTPException(400, "Owners can edit expenses directly.")

    er = EditRequest(
        group_id=expense.group_id,
        expense_id=expense_id,
        requested_by_id=body.requested_by_id,
        proposed_changes=body.proposed_changes,
        message=body.message,
        status=EditRequestStatus.PENDING,
    )
    db.add(er)
    db.add(ActivityLog(
        group_id=expense.group_id,
        actor_user_id=body.requested_by_id,
        action_type=ActionType.EDIT_REQUEST,
        entity_type=EntityType.EDIT_REQUEST,
        entity_id=expense_id,
        details={"expense": expense.description, "requester": user.name},
    ))
    db.commit()
    db.refresh(er)
    return _to_out(er)


@router.get("/groups/{group_id}/edit-requests", response_model=List[EditRequestOut])
def list_edit_requests(
    group_id: int,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(EditRequest).filter(EditRequest.group_id == group_id)
    if status:
        q = q.filter(EditRequest.status == status)
    else:
        q = q.filter(EditRequest.status == EditRequestStatus.PENDING)
    return [_to_out(er) for er in q.order_by(EditRequest.created_at.desc()).all()]


@router.put("/edit-requests/{er_id}/review", response_model=EditRequestOut)
def review_edit_request(er_id: int, body: ReviewBody, db: Session = Depends(get_db)):
    er = db.query(EditRequest).filter(EditRequest.id == er_id).first()
    if not er:
        raise HTTPException(404, "Edit request not found.")
    if er.status != EditRequestStatus.PENDING:
        raise HTTPException(400, "This request has already been reviewed.")
    if body.status not in (EditRequestStatus.APPROVED, EditRequestStatus.REJECTED):
        raise HTTPException(400, "Status must be 'approved' or 'rejected'.")

    reviewer = db.query(User).filter(User.id == body.actor_user_id).first()
    if not reviewer:
        raise HTTPException(404, "Reviewer not found.")

    er.status = body.status
    er.reviewed_by_id = body.actor_user_id
    er.reviewed_at = datetime.utcnow()

    if body.status == EditRequestStatus.APPROVED:
        expense = db.query(Expense).filter(Expense.id == er.expense_id).first()
        if expense:
            changes = er.proposed_changes
            for field in ("description", "category", "notes"):
                if field in changes:
                    setattr(expense, field, changes[field])
            expense.updated_at = datetime.utcnow()
            db.add(ActivityLog(
                group_id=er.group_id,
                actor_user_id=body.actor_user_id,
                action_type=ActionType.EDIT,
                entity_type=EntityType.EXPENSE,
                entity_id=expense.id,
                details={"description": expense.description, "approved_from": er.requested_by.name},
            ))

    db.commit()
    db.refresh(er)
    return _to_out(er)
