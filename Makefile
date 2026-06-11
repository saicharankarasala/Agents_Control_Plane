.PHONY: help up down api worker web sdk-install seed migrate test fmt

help:
	@echo "Agent Control Plane — make targets"
	@echo "  up          docker-compose up (postgres, redis, qdrant, api, worker)"
	@echo "  down        stop all containers"
	@echo "  api         run FastAPI locally (SQLite fallback if no Postgres)"
	@echo "  worker      run arq worker locally"
	@echo "  web         run Next.js dev server"
	@echo "  sdk-install install the Python SDK in editable mode"
	@echo "  seed        load demo data"
	@echo "  migrate     run alembic migrations"
	@echo "  test        run backend + sdk tests"

up:
	docker compose up -d --build

down:
	docker compose down

api:
	cd apps/api && python -m uvicorn app.main:app --reload --port 8000

worker:
	cd apps/api && arq app.workers.tasks.WorkerSettings

web:
	cd apps/web && npm run dev

sdk-install:
	cd packages/sdk-python && pip install -e .

seed:
	python seeds/generate_demo_data.py --n 120

migrate:
	cd apps/api && alembic upgrade head

test:
	cd apps/api && pytest -q
	cd packages/sdk-python && pytest -q

fmt:
	ruff format apps/api packages/sdk-python
