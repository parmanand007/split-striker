from datetime import datetime, date as date_type
from decimal import Decimal
from typing import Optional, List
import enum

from sqlalchemy import (
    String, Integer, Boolean, Numeric, Date, DateTime,
    ForeignKey, JSON, Enum as SAEnum, Table, Column,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class SplitType(str, enum.Enum):
    EQUAL = "equal"
    EXACT = "exact"
    PERCENTAGE = "percentage"
    SHARES = "shares"


class ActionType(str, enum.Enum):
    CREATE = "create"
    EDIT = "edit"
    DELETE = "delete"
    PAYMENT = "payment"
    MEMBER_ADD = "member_add"
    MEMBER_REMOVE = "member_remove"
    EDIT_REQUEST = "edit_request"
    INVITE = "invite"


class EntityType(str, enum.Enum):
    EXPENSE = "expense"
    PAYMENT = "payment"
    GROUP = "group"
    MEMBER = "member"
    EDIT_REQUEST = "edit_request"


class EditRequestStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


group_members = Table(
    "group_members",
    Base.metadata,
    Column("group_id", Integer, ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(200), nullable=True, unique=True, index=True)
    avatar_color: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    groups: Mapped[List["Group"]] = relationship(
        "Group", secondary="group_members", back_populates="members"
    )


class Group(Base):
    __tablename__ = "groups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    simplify_debts: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    emoji: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    members: Mapped[List["User"]] = relationship(
        "User", secondary="group_members", back_populates="groups"
    )
    expenses: Mapped[List["Expense"]] = relationship(
        "Expense", back_populates="group", foreign_keys="Expense.group_id"
    )
    payments: Mapped[List["Payment"]] = relationship("Payment", back_populates="group")
    activity_logs: Mapped[List["ActivityLog"]] = relationship("ActivityLog", back_populates="group")
    invites: Mapped[List["GroupInvite"]] = relationship("GroupInvite", back_populates="group")
    edit_requests: Mapped[List["EditRequest"]] = relationship("EditRequest", back_populates="group")


class Expense(Base):
    """
    All monetary amounts stored in group's default currency (after FX conversion).
    paid_by and split_amounts use string keys (user_id) and string values (Decimal str).
    """
    __tablename__ = "expenses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    group_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("groups.id", ondelete="SET NULL"), nullable=True, index=True
    )
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)

    original_amount: Mapped[Decimal] = mapped_column(Numeric(15, 4), nullable=False)
    original_currency: Mapped[str] = mapped_column(String(3), nullable=False)
    fx_rate: Mapped[Decimal] = mapped_column(Numeric(15, 6), default=Decimal("1"), nullable=False)

    total_amount: Mapped[Decimal] = mapped_column(Numeric(15, 4), nullable=False)

    paid_by: Mapped[dict] = mapped_column(JSON, nullable=False)
    split_type: Mapped[SplitType] = mapped_column(SAEnum(SplitType), nullable=False)
    split_amounts: Mapped[dict] = mapped_column(JSON, nullable=False)
    split_raw: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    date: Mapped[date_type] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    is_negative: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    recurrence_rule: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    recurrence_end_date: Mapped[Optional[date_type]] = mapped_column(Date, nullable=True)
    parent_expense_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("expenses.id"), nullable=True
    )

    group: Mapped[Optional["Group"]] = relationship("Group", back_populates="expenses")
    child_expenses: Mapped[List["Expense"]] = relationship(
        "Expense", foreign_keys=[parent_expense_id]
    )
    edit_requests: Mapped[List["EditRequest"]] = relationship("EditRequest", back_populates="expense")


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    group_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("groups.id", ondelete="SET NULL"), nullable=True, index=True
    )
    from_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    to_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 4), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    date: Mapped[date_type] = mapped_column(Date, nullable=False)
    note: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    group: Mapped[Optional["Group"]] = relationship("Group", back_populates="payments")
    from_user: Mapped["User"] = relationship("User", foreign_keys=[from_user_id])
    to_user: Mapped["User"] = relationship("User", foreign_keys=[to_user_id])


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    group_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("groups.id", ondelete="SET NULL"), nullable=True, index=True
    )
    actor_user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    action_type: Mapped[ActionType] = mapped_column(SAEnum(ActionType), nullable=False)
    entity_type: Mapped[EntityType] = mapped_column(SAEnum(EntityType), nullable=False)
    entity_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    details: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    group: Mapped[Optional["Group"]] = relationship("Group", back_populates="activity_logs")
    actor: Mapped[Optional["User"]] = relationship("User", foreign_keys=[actor_user_id])


class GroupInvite(Base):
    __tablename__ = "group_invites"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    group_id: Mapped[int] = mapped_column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    created_by_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    use_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    group: Mapped["Group"] = relationship("Group", back_populates="invites")
    created_by: Mapped["User"] = relationship("User", foreign_keys=[created_by_id])


class EditRequest(Base):
    __tablename__ = "edit_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    group_id: Mapped[int] = mapped_column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    expense_id: Mapped[int] = mapped_column(Integer, ForeignKey("expenses.id", ondelete="CASCADE"), nullable=False)
    requested_by_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    proposed_changes: Mapped[dict] = mapped_column(JSON, nullable=False)
    message: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    status: Mapped[EditRequestStatus] = mapped_column(
        SAEnum(EditRequestStatus), default=EditRequestStatus.PENDING, nullable=False
    )
    reviewed_by_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    group: Mapped["Group"] = relationship("Group", back_populates="edit_requests")
    expense: Mapped["Expense"] = relationship("Expense", back_populates="edit_requests")
    requested_by: Mapped["User"] = relationship("User", foreign_keys=[requested_by_id])
    reviewed_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[reviewed_by_id])
