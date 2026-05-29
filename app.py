from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from sqlalchemy import create_engine, Column, String, Float, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from pydantic import BaseModel, ConfigDict, field_validator

from datetime import datetime

import re

DATABASE_URL = "sqlite:///./debts.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

class DebtModel(Base):

    __tablename__ = "debts"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    date = Column(DateTime, default=datetime.now)

Base.metadata.create_all(bind=engine)

class DebtCreate(BaseModel):

    name: str
    amount: float

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):

        if not re.match(r"^[A-Za-zÀ-ÿʻʼ‘’\s]+$", v):
            raise ValueError("Faqat harf mumkin")

        return v.strip()

class DebtResponse(BaseModel):

    id: str
    name: str
    amount: float
    date: str

    model_config = ConfigDict(from_attributes=True)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")

def get_db():

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()

@app.get("/")
async def home():
    return FileResponse("templates/index.html")

@app.get("/api/debts", response_model=list[DebtResponse])
async def get_debts(db: Session = Depends(get_db)):

    debts = db.query(DebtModel).order_by(DebtModel.date.desc()).all()

    return [
        DebtResponse(
            id=d.id,
            name=d.name,
            amount=d.amount,
            date=d.date.strftime("%d.%m.%Y %H:%M")
        )
        for d in debts
    ]

@app.post("/api/debts", response_model=DebtResponse)
async def add_debt(
    debt: DebtCreate,
    db: Session = Depends(get_db)
):

    if debt.amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Noto'g'ri summa"
        )

    now = datetime.now()

    debt_id = str(int(now.timestamp() * 1000))

    new_debt = DebtModel(
        id=debt_id,
        name=debt.name,
        amount=debt.amount,
        date=now
    )

    db.add(new_debt)

    db.commit()

    db.refresh(new_debt)

    return DebtResponse(
        id=new_debt.id,
        name=new_debt.name,
        amount=new_debt.amount,
        date=new_debt.date.strftime("%d.%m.%Y %H:%M")
    )

@app.delete("/api/debts/{debt_id}")
async def delete_debt(
    debt_id: str,
    db: Session = Depends(get_db)
):

    debt = db.query(DebtModel).filter(
        DebtModel.id == debt_id
    ).first()

    if not debt:
        raise HTTPException(
            status_code=404,
            detail="Topilmadi"
        )

    db.delete(debt)

    db.commit()

    return {
        "success": True
    }

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000
    )