import os
from datetime import datetime, timezone
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import Boolean, Column, DateTime, Integer, String, create_engine, text
from sqlalchemy.orm import Session, declarative_base, sessionmaker

load_dotenv()


def resolve_database_url() -> tuple[str, str]:
    """Resolve DATABASE_URL / MYSQL_URL, falling back to local SQLite for quick testing."""
    raw_url = (
        os.getenv("DATABASE_URL")
        or os.getenv("MYSQL_PUBLIC_URL")
        or os.getenv("MYSQL_URL")
        or ""
    ).strip()

    if not raw_url:
        return "sqlite:///./local_dev.db", "SQLite (本地快速测试库)"

    if raw_url.startswith("mysql://"):
        return raw_url.replace("mysql://", "mysql+pymysql://", 1), "MySQL (Railway 云数据库)"
    if raw_url.startswith("mysql+pymysql://"):
        return raw_url, "MySQL (Railway 云数据库)"
    return raw_url, "Custom Database"


DB_URL, DB_LABEL = resolve_database_url()

connect_args = {"check_same_thread": False} if DB_URL.startswith("sqlite") else {}
engine = create_engine(DB_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class TaskItem(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    note = Column(String(500), default="")
    completed = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)


Base.metadata.create_all(bind=engine)

app = FastAPI(title="Auto Deploy Test API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    note: Optional[str] = Field(default="", max_length=500)


class TaskResponse(BaseModel):
    id: int
    title: str
    note: str
    completed: bool
    created_at: datetime

    model_config = {"from_attributes": True}


@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    total = db.query(TaskItem).count()
    return {
        "status": "ok",
        "database_type": DB_LABEL,
        "environment": os.getenv("RAILWAY_ENVIRONMENT_NAME", "local"),
        "task_count": total,
    }


@app.get("/api/tasks", response_model=list[TaskResponse])
def list_tasks(db: Session = Depends(get_db)):
    return db.query(TaskItem).order_by(TaskItem.id.desc()).all()


@app.post("/api/tasks", response_model=TaskResponse)
def create_task(payload: TaskCreate, db: Session = Depends(get_db)):
    item = TaskItem(title=payload.title.strip(), note=(payload.note or "").strip())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@app.patch("/api/tasks/{task_id}/toggle", response_model=TaskResponse)
def toggle_task(task_id: int, db: Session = Depends(get_db)):
    item = db.query(TaskItem).filter(TaskItem.id == task_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Task not found")
    item.completed = not item.completed
    db.commit()
    db.refresh(item)
    return item


@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    item = db.query(TaskItem).filter(TaskItem.id == task_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(item)
    db.commit()
    return {"deleted": True, "id": task_id}
