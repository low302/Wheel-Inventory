.PHONY: help start stop restart build rebuild logs clean test backup restore status health

# Default target
help:
	@echo "🚗 OEM Subaru Wheel Inventory System v2.0"
	@echo ""
	@echo "Available commands:"
	@echo "  make start        - Start all services"
	@echo "  make stop         - Stop all services"
	@echo "  make restart      - Restart all services"
	@echo "  make build        - Build all images"
	@echo "  make rebuild      - Rebuild all images (no cache)"
	@echo "  make logs         - View all logs (tail -f)"
	@echo "  make logs-backend - View backend logs"
	@echo "  make logs-frontend - View frontend logs"
	@echo "  make logs-db      - View database logs"
	@echo "  make clean        - Stop and remove all containers/volumes"
	@echo "  make test         - Run all tests"
	@echo "  make test-backend - Run backend tests"
	@echo "  make test-frontend - Run frontend tests"
	@echo "  make backup       - Create manual backup"
	@echo "  make restore      - Restore from latest backup"
	@echo "  make status       - Show service status"
	@echo "  make health       - Check service health"
	@echo ""

# Start services
start:
	@echo "🚀 Starting services..."
	docker-compose up -d
	@echo "✅ Services started!"
	@echo "   Frontend: http://localhost:3000"
	@echo "   Backend:  http://localhost:3001"

# Stop services
stop:
	@echo "⏹️  Stopping services..."
	docker-compose down
	@echo "✅ Services stopped!"

# Restart services
restart: stop start

# Build images
build:
	@echo "🔨 Building images..."
	docker-compose build
	@echo "✅ Build complete!"

# Rebuild images (no cache)
rebuild:
	@echo "🔨 Rebuilding images (no cache)..."
	docker-compose build --no-cache
	@echo "✅ Rebuild complete!"

# View logs
logs:
	docker-compose logs -f

logs-backend:
	docker-compose logs -f backend

logs-frontend:
	docker-compose logs -f frontend

logs-db:
	docker-compose logs -f postgres

# Clean up
clean:
	@echo "🧹 Cleaning up..."
	docker-compose down -v
	@echo "✅ Cleanup complete!"

# Run tests
test: test-backend test-frontend

test-backend:
	@echo "🧪 Running backend tests..."
	docker exec wheel_inventory_backend npm test

test-frontend:
	@echo "🧪 Running frontend tests..."
	docker exec wheel_inventory_frontend npm test

# Backup
backup:
	@echo "💾 Creating manual backup..."
	docker exec wheel_inventory_backup /backup-script.sh
	@echo "✅ Backup complete!"
	@ls -lh ./backups/

# Restore
restore:
	@echo "♻️  Restoring from latest backup..."
	./restore.sh latest

# Status
status:
	@echo "📊 Service Status:"
	@docker-compose ps

# Health check
health:
	@echo "🏥 Health Check:"
	@echo -n "Backend:  "
	@curl -s http://localhost:3001/api/health | grep -q "healthy" && echo "✅ Healthy" || echo "❌ Unhealthy"
	@echo -n "Frontend: "
	@curl -s http://localhost:3000/health | grep -q "healthy" && echo "✅ Healthy" || echo "❌ Unhealthy"
	@echo -n "Database: "
	@docker exec wheel_inventory_db pg_isready -U wheeluser -q && echo "✅ Healthy" || echo "❌ Unhealthy"
	@echo -n "Redis:    "
	@docker exec wheel_inventory_redis redis-cli PING 2>/dev/null | grep -q "PONG" && echo "✅ Healthy" || echo "⚠️  Not available (optional)"

# Development helpers
dev-backend:
	docker exec -it wheel_inventory_backend npm run dev

shell-backend:
	docker exec -it wheel_inventory_backend /bin/sh

shell-db:
	docker exec -it wheel_inventory_db psql -U wheeluser -d wheel_inventory

shell-redis:
	docker exec -it wheel_inventory_redis redis-cli

# Database helpers
db-vacuum:
	@echo "🧹 Vacuuming database..."
	docker exec wheel_inventory_db psql -U wheeluser -d wheel_inventory -c "VACUUM ANALYZE;"
	@echo "✅ Done!"

db-size:
	@echo "📊 Database size:"
	@docker exec wheel_inventory_db psql -U wheeluser -d wheel_inventory -c "SELECT pg_size_pretty(pg_database_size('wheel_inventory'));"

# Cache helpers
cache-clear:
	@echo "🗑️  Clearing Redis cache..."
	docker exec wheel_inventory_redis redis-cli FLUSHALL
	@echo "✅ Cache cleared!"

cache-stats:
	@echo "📊 Cache statistics:"
	@docker exec wheel_inventory_redis redis-cli INFO stats
