from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session

from auth_utils import decode_token
from database import get_db
from models import User


def get_current_user(
    authorization: str = Header(None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> User:
    """Validate JWT and return the authenticated User. Raises 401 on any failure."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Authentication required.")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        user_id = decode_token(token)
    except Exception:
        raise HTTPException(401, "Invalid or expired token.")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(401, "User not found.")
    return user
