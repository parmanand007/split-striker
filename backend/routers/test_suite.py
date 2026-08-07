from fastapi import APIRouter
from typing import Optional
from services.test_suite_runner import run_suite

router = APIRouter(prefix="/api/test-suite", tags=["test-suite"])


@router.post("/run")
def run_test_suite(category: Optional[str] = None):
    return run_suite(category_filter=category)
