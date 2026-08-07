from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import ActivityLog, Group, User
from schemas import ActivityLogOut

router = APIRouter(tags=["activity"])


def _log_out(log: ActivityLog) -> ActivityLogOut:
    return ActivityLogOut(
        id=log.id,
        group_id=log.group_id,
        actor_user_id=log.actor_user_id,
        actor_name=log.actor.name if log.actor else None,
        action_type=log.action_type,
        entity_type=log.entity_type,
        entity_id=log.entity_id,
        details=log.details,
        created_at=log.created_at,
    )


@router.get("/api/groups/{group_id}/activity", response_model=List[ActivityLogOut])
def group_activity(
    group_id: int,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    if not db.query(Group).filter(Group.id == group_id).first():
        raise HTTPException(404, "Group not found.")
    logs = (
        db.query(ActivityLog)
        .filter(ActivityLog.group_id == group_id)
        .order_by(ActivityLog.created_at.desc())
        .limit(limit)
        .all()
    )
    return [_log_out(l) for l in logs]


@router.get("/api/users/{user_id}/activity", response_model=List[ActivityLogOut])
def user_activity(
    user_id: int,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found.")
    group_ids = [g.id for g in user.groups]
    logs = (
        db.query(ActivityLog)
        .filter(ActivityLog.group_id.in_(group_ids))
        .order_by(ActivityLog.created_at.desc())
        .limit(limit)
        .all()
    )
    return [_log_out(l) for l in logs]
