from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import SignupBody, LoginBody, AuthOut, UserOut
from auth_utils import hash_password, verify_password, create_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", response_model=AuthOut, status_code=201)
def signup(body: SignupBody, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        if existing.password_hash:
            raise HTTPException(400, "An account with this email already exists. Please sign in.")
        # Old account (created before passwords) — set the password now
        existing.password_hash = hash_password(body.password)
        if body.name.strip():
            existing.name = body.name.strip()
        db.commit()
        db.refresh(existing)
        return AuthOut(token=create_token(existing.id), user=UserOut.model_validate(existing))
    user = User(
        name=body.name.strip(),
        email=email,
        password_hash=hash_password(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return AuthOut(token=create_token(user.id), user=UserOut.model_validate(user))


@router.post("/login", response_model=AuthOut)
def login(body: LoginBody, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user or not user.password_hash or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password.")
    return AuthOut(token=create_token(user.id), user=UserOut.model_validate(user))
