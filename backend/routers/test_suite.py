from fastapi import APIRouter, Depends
from typing import Optional
from services.test_suite_runner import run_suite
from dependencies import get_current_user

router = APIRouter(prefix="/api/test-suite", tags=["test-suite"], dependencies=[Depends(get_current_user)])


@router.post("/run")
def run_test_suite(category: Optional[str] = None):
    return run_suite(category_filter=category)
