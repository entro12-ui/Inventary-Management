# EasyStock Backend

FastAPI + PostgreSQL backend scaffold for inventory management.

## Included structure

- `app/` with API, models, schemas, core, and utilities
- `alembic/` migration folder placeholder
- `.env`, `requirements.txt`, `Dockerfile`
- `scripts/smoke_test.py` tiny runtime harness

## Tech stack recommendation alignment

- Frontend: React + TypeScript + TailwindCSS (separate app)
- Backend: Python + FastAPI (this repo)
- Database: PostgreSQL
- AI/ML: Python with scikit-learn and TensorFlow hooks

## Quick start

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Smoke test

```bash
python scripts/smoke_test.py
```
