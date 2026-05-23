from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy import create_engine, Column, String, Float, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from pydantic import BaseModel, ConfigDict
from datetime import datetime
import os

# 🔧 Database Configuration
DATABASE_URL = "sqlite:///./debts.db"
engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 📊 Database Model
class DebtModel(Base):
    __tablename__ = "debts"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    date = Column(DateTime, default=datetime.now, nullable=False)

# Create tables
Base.metadata.create_all(bind=engine)

# 🎯 Pydantic Models
class DebtCreate(BaseModel):
    name: str
    amount: float

class DebtResponse(BaseModel):
    id: str
    name: str
    amount: float
    date: str
    
    model_config = ConfigDict(from_attributes=True)

# ⚙️ FastAPI App Setup
app = FastAPI(
    title="Qarz Daftari API",
    description="Uzbek qarz boshqaruvi tizimi",
    version="1.0.0"
)

# 🌐 CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 📁 Static files va templates
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

# 🔌 Database Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 🏠 Main Page
@app.get("/")
async def read_root():
    if os.path.exists("templates/index.html"):
        return FileResponse("templates/index.html")
    return {"message": "Qarz Daftari API - FastAPI"}

# ✅ Health Check
@app.get("/health")
async def health():
    return {"status": "ok"}

# 📋 GET: Barcha qarzlarni olish
@app.get("/api/debts", response_model=list[DebtResponse])
async def get_debts(db: Session = Depends(get_db)):
    """Barcha qarzlarni olish"""
    debts = db.query(DebtModel).all()
    return [
        DebtResponse(
            id=d.id,
            name=d.name,
            amount=d.amount,
            date=d.date.strftime("%d.%m.%Y %H:%M")
        )
        for d in debts
    ]

# ➕ POST: Yangi qarz qo'shish
@app.post("/api/debts", response_model=DebtResponse, status_code=201)
async def add_debt(debt: DebtCreate, db: Session = Depends(get_db)):
    """Yangi qarz qo'shish"""
    if not debt.name or debt.name.strip() == "":
        raise HTTPException(status_code=400, detail="Ism bo'sh bo'lishi mumkin emas")
    
    if debt.amount <= 0:
        raise HTTPException(status_code=400, detail="Miqdor musbat bo'lishi kerak")
    
    now = datetime.now()
    debt_id = str(int(now.timestamp() * 1000))
    
    new_debt = DebtModel(
        id=debt_id,
        name=debt.name.strip(),
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

# ❌ DELETE: Qarzni o'chirish
@app.delete("/api/debts/{debt_id}")
async def delete_debt(debt_id: str, db: Session = Depends(get_db)):
    """Qarzni ID bo'yicha o'chirish"""
    debt = db.query(DebtModel).filter(DebtModel.id == debt_id).first()
    
    if not debt:
        raise HTTPException(status_code=404, detail="Qarz topilmadi")
    
    db.delete(debt)
    db.commit()
    
    return {"success": True, "message": "Qarz o'chirildi"}

# 📊 GET: Jami qarz miqdori
@app.get("/api/debts/stats/total")
async def get_total_debt(db: Session = Depends(get_db)):
    """Jami qarz miqdorini olish"""
    debts = db.query(DebtModel).all()
    total = sum(d.amount for d in debts)
    return {"total_debt": total, "count": len(debts)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)