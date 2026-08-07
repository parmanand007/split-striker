from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base, run_migrations
import models  # noqa: register models before create_all

from routers import users, groups, expenses, payments, balances, activity, test_suite
from routers import invites, edit_requests

Base.metadata.create_all(bind=engine)
run_migrations()

app = FastAPI(title="Split Striker API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://lining-roundish-freeload.ngrok-free.dev",
        "https://split-striker-1.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(groups.router)
app.include_router(expenses.router)
app.include_router(payments.router)
app.include_router(balances.router)
app.include_router(activity.router)
app.include_router(test_suite.router)
app.include_router(invites.router)
app.include_router(edit_requests.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "2.0.0"}
