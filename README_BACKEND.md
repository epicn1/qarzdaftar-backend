# Qarz Daftari - Backend

Flask REST API backend qarz daftari uchun.

## Features

- 📡 REST API endpoints
- 💾 JSON-based database
- 🔄 CORS support
- 🛡️ Error handling

## Installation

```bash
pip install -r requirements.txt
```

## Running

```bash
python app.py
```

Server: http://localhost:5000

## API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/` | Main page |
| GET | `/api/debts` | Get all debts |
| POST | `/api/debts` | Add new debt |
| DELETE | `/api/debts/<id>` | Delete debt |

## Technology

- Flask 3.0.3
- Flask-CORS 4.0.0
- Python 3.x
