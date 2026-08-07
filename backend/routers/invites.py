import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from dependencies import get_current_user
from models import Group, GroupInvite, User, ActivityLog, ActionType, EntityType

router = APIRouter(prefix="/api/invite", tags=["invites"], dependencies=[Depends(get_current_user)])


class InviteOut(BaseModel):
    token: str
    group_id: int
    group_name: str
    group_currency: str
    member_count: int
    invited_by: str
    expires_at: datetime
    is_active: bool


class AcceptInviteBody(BaseModel):
    user_id: int


@router.post("/groups/{group_id}/create")
def create_invite(group_id: int, actor_user_id: int, db: Session = Depends(get_db)):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(404, "Group not found.")
    actor = db.query(User).filter(User.id == actor_user_id).first()
    if not actor:
        raise HTTPException(404, "User not found.")

    token = secrets.token_urlsafe(32)
    invite = GroupInvite(
        token=token,
        group_id=group_id,
        created_by_id=actor_user_id,
        expires_at=datetime.utcnow() + timedelta(days=7),
        is_active=True,
    )
    db.add(invite)
    db.add(ActivityLog(
        group_id=group_id,
        actor_user_id=actor_user_id,
        action_type=ActionType.INVITE,
        entity_type=EntityType.GROUP,
        entity_id=group_id,
        details={"invited_by": actor.name},
    ))
    db.commit()
    db.refresh(invite)
    return {"token": token, "expires_at": invite.expires_at}


@router.get("/{token}", response_model=InviteOut)
def get_invite(token: str, db: Session = Depends(get_db)):
    invite = db.query(GroupInvite).filter(GroupInvite.token == token).first()
    if not invite:
        raise HTTPException(404, "Invite not found.")
    if not invite.is_active:
        raise HTTPException(410, "This invite link has been deactivated.")
    if invite.expires_at < datetime.utcnow():
        raise HTTPException(410, "This invite link has expired.")
    return InviteOut(
        token=invite.token,
        group_id=invite.group_id,
        group_name=invite.group.name,
        group_currency=invite.group.currency,
        member_count=len(invite.group.members),
        invited_by=invite.created_by.name,
        expires_at=invite.expires_at,
        is_active=invite.is_active,
    )


@router.post("/{token}/accept")
def accept_invite(token: str, body: AcceptInviteBody, db: Session = Depends(get_db)):
    invite = db.query(GroupInvite).filter(GroupInvite.token == token).first()
    if not invite:
        raise HTTPException(404, "Invite not found.")
    if not invite.is_active:
        raise HTTPException(410, "This invite link has been deactivated.")
    if invite.expires_at < datetime.utcnow():
        raise HTTPException(410, "This invite link has expired.")

    user = db.query(User).filter(User.id == body.user_id).first()
    if not user:
        raise HTTPException(404, "User not found.")

    group = invite.group
    if group.archived:
        raise HTTPException(400, "Cannot join an archived group.")
    if user in group.members:
        return {"message": "Already a member", "group_id": group.id}

    group.members.append(user)
    invite.use_count += 1
    db.add(ActivityLog(
        group_id=group.id,
        actor_user_id=body.user_id,
        action_type=ActionType.MEMBER_ADD,
        entity_type=EntityType.MEMBER,
        entity_id=user.id,
        details={"user_name": user.name, "via_invite": True},
    ))
    db.commit()
    return {"message": "Joined successfully", "group_id": group.id}


@router.delete("/groups/{group_id}/invite/{token}")
def deactivate_invite(group_id: int, token: str, db: Session = Depends(get_db)):
    invite = db.query(GroupInvite).filter(
        GroupInvite.token == token, GroupInvite.group_id == group_id
    ).first()
    if not invite:
        raise HTTPException(404, "Invite not found.")
    invite.is_active = False
    db.commit()
    return {"message": "Invite deactivated."}
