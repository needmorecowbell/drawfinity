.PHONY: help up down restart logs server frontend dev stop dev-stop tauri test build clean clean-all docs docs-dev docs-preview

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

# ── Docker (full stack) ─────────────────────────────────

up: ## Start server + frontend via Docker Compose
	docker compose up --build -d
	@echo "\n  Frontend:  http://localhost:1420"
	@echo "  Server:    ws://localhost:8080"
	@echo "  Health:    http://localhost:8080/health\n"

down: ## Stop and remove containers
	docker compose down

restart: down up ## Restart everything

logs: ## Tail logs from all services
	docker compose logs -f

logs-server: ## Tail server logs only
	docker compose logs -f server

logs-frontend: ## Tail frontend logs only
	docker compose logs -f frontend

# ── Local development ────────────────────────────────────

node_modules: package.json ## Install npm dependencies if needed
	npm install
	@touch node_modules

dev: stop node_modules ## Start server + frontend locally (no Docker)
	@echo "Starting server and frontend..."
	@cd server && cargo run -- --port 8080 --data-dir ./data &
	@sleep 2
	@npx vite --host --port 1420 &
	@echo "\n  Frontend:  http://localhost:1420"
	@echo "  Server:    ws://localhost:8080"
	@echo "  Stop with:  make stop\n"
	@wait

stop: ## Stop local dev processes (Vite + server)
	@-pkill -f "drawfinity-server" 2>/dev/null; true
	@-pkill -f "vite.*--port 1420" 2>/dev/null; true
	@-lsof -ti:1420 2>/dev/null | xargs kill 2>/dev/null; true
	@-lsof -ti:8080 2>/dev/null | xargs kill 2>/dev/null; true
	@echo "Stopped local dev processes"

server: ## Start only the collaboration server locally
	cd server && cargo run -- --port 8080 --data-dir ./data

frontend: node_modules ## Start only the frontend dev server locally
	npx vite --host --port 1420

tauri: node_modules ## Start Tauri desktop app in dev mode
	npm run tauri dev

# ── Testing & building ───────────────────────────────────

test: node_modules ## Run all frontend tests
	npx vitest run

test-watch: node_modules ## Run frontend tests in watch mode
	npx vitest --watch

test-server: ## Run server tests
	cd server && cargo test

test-all: test test-server ## Run all tests (frontend + server)

typecheck: node_modules ## TypeScript type check
	npx tsc --noEmit

build: node_modules ## Production build (frontend only)
	npm run build

build-tauri: node_modules ## Production Tauri desktop build
	npm run tauri build

build-server: ## Production server build
	cd server && cargo build --release

build-all: build build-server ## Build frontend + server

# ── Documentation ────────────────────────────────────────

docs: node_modules ## Build VitePress documentation site
	npm run docs:build

docs-dev: node_modules ## Start VitePress docs dev server
	npm run docs:dev

docs-preview: node_modules ## Preview built docs site
	npm run docs:preview

# ── Cleanup ──────────────────────────────────────────────

clean: ## Remove build artifacts
	rm -rf dist
	cd server && cargo clean

clean-docker: ## Remove Docker containers, images, and volumes
	docker compose down -v --rmi local

clean-all: stop clean clean-docker ## Remove everything (build artifacts + Docker)
	npm run clean:cache 2>/dev/null || true
