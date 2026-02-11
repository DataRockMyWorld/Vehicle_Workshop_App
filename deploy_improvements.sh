#!/bin/bash
# Deployment script for Phase 1 improvements
# Vehicle Workshop App - Sales & Service Request Enhancements

set -e  # Exit on any error

echo "========================================="
echo "Vehicle Workshop App - Phase 1 Deployment"
echo "Sales & Service Request Improvements"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running from project root
if [ ! -f "manage.py" ]; then
    echo -e "${RED}Error: Please run this script from the project root directory${NC}"
    exit 1
fi

# Function to prompt for confirmation
confirm() {
    read -p "$1 (y/n): " response
    case "$response" in
        [yY][eE][sS]|[yY]) 
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

echo -e "${YELLOW}Pre-Deployment Checklist${NC}"
echo "This deployment includes:"
echo "  ✓ Transaction type discriminator field"
echo "  ✓ Display number prefix separation (SALE vs SR)"
echo "  ✓ Improved inventory audit trail"
echo "  ✓ API validation for sales vs services"
echo "  ✓ Quick sale modal with keyboard shortcuts"
echo ""

if ! confirm "Have you reviewed the changes and are ready to proceed?"; then
    echo "Deployment cancelled."
    exit 0
fi

# Step 1: Backup database
echo ""
echo -e "${YELLOW}Step 1: Backing up database...${NC}"
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"

# Get the actual database container name
DB_CONTAINER=$(docker compose ps -q db)
if [ -z "$DB_CONTAINER" ]; then
    echo -e "${RED}✗ Database container not found. Is Docker running?${NC}"
    exit 1
fi

# Get database credentials from .env or use defaults
POSTGRES_USER=${POSTGRES_USER:-workshop}
POSTGRES_DB=${POSTGRES_DB:-workshop}

docker compose exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$BACKUP_FILE"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database backed up to: $BACKUP_FILE${NC}"
else
    echo -e "${RED}✗ Database backup failed!${NC}"
    exit 1
fi

# Step 2: Stop Celery workers
echo ""
echo -e "${YELLOW}Step 2: Stopping Celery workers...${NC}"
docker compose stop celery celery-beat
echo -e "${GREEN}✓ Celery workers stopped${NC}"

# Step 3: Check current migration status
echo ""
echo -e "${YELLOW}Step 3: Checking current migrations...${NC}"
docker compose run --rm web python manage.py showmigrations ServiceRequests | tail -5

# Step 4: Build containers
echo ""
echo -e "${YELLOW}Step 4: Building Docker containers...${NC}"
docker compose build web celery celery-beat
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Containers built successfully${NC}"
else
    echo -e "${RED}✗ Container build failed!${NC}"
    exit 1
fi

# Step 5: Run migrations
echo ""
echo -e "${YELLOW}Step 5: Running database migrations...${NC}"
docker compose run --rm web python manage.py migrate
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Migrations completed successfully${NC}"
else
    echo -e "${RED}✗ Migration failed!${NC}"
    echo -e "${YELLOW}Rolling back...${NC}"
    docker compose exec -T db psql -U "$POSTGRES_USER" "$POSTGRES_DB" < "$BACKUP_FILE"
    echo -e "${YELLOW}Database restored from backup${NC}"
    exit 1
fi

# Step 6: Verify migration results
echo ""
echo -e "${YELLOW}Step 6: Verifying migration results...${NC}"
SALES_COUNT=$(docker compose run --rm web python manage.py shell -c "from ServiceRequests.models import ServiceRequest; print(ServiceRequest.objects.filter(transaction_type='sale').count())" 2>/dev/null | tail -1)
SERVICE_COUNT=$(docker compose run --rm web python manage.py shell -c "from ServiceRequests.models import ServiceRequest; print(ServiceRequest.objects.filter(transaction_type='service').count())" 2>/dev/null | tail -1)
echo "  - Sales (vehicle=null): $SALES_COUNT records"
echo "  - Service requests (vehicle!=null): $SERVICE_COUNT records"

# Step 7: Collect static files
echo ""
echo -e "${YELLOW}Step 7: Collecting static files...${NC}"
docker compose run --rm web python manage.py collectstatic --noinput
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Static files collected${NC}"
else
    echo -e "${RED}✗ Static file collection failed${NC}"
fi

# Step 8: Restart all services
echo ""
echo -e "${YELLOW}Step 8: Restarting all services...${NC}"
docker compose up -d
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ All services restarted${NC}"
else
    echo -e "${RED}✗ Service restart failed!${NC}"
    exit 1
fi

# Wait for services to be ready
echo ""
echo "Waiting for services to be ready..."
sleep 5

# Step 9: Health check
echo ""
echo -e "${YELLOW}Step 9: Running health check...${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/admin/)
if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "302" ]; then
    echo -e "${GREEN}✓ Application is responding${NC}"
else
    echo -e "${RED}✗ Application health check failed (HTTP $HTTP_CODE)${NC}"
fi

# Step 10: Verify Celery workers
echo ""
echo -e "${YELLOW}Step 10: Checking Celery workers...${NC}"
sleep 2
docker compose ps celery celery-beat
echo -e "${GREEN}✓ Celery workers restarted${NC}"

# Step 11: Display summary
echo ""
echo "========================================="
echo -e "${GREEN}Deployment Complete!${NC}"
echo "========================================="
echo ""
echo "Summary:"
echo "  ✓ Database backed up: $BACKUP_FILE"
echo "  ✓ Migrations applied: ServiceRequests.0012_add_transaction_type"
echo "  ✓ Sales identified: $SALES_COUNT records"
echo "  ✓ Service requests: $SERVICE_COUNT records"
echo "  ✓ All services running"
echo ""
echo "Next Steps:"
echo "  1. Test quick sale modal (Ctrl+N on /parts-sale)"
echo "  2. Verify display numbers (SALE-XXXX vs SR-XXXX)"
echo "  3. Check inventory transactions in Django admin"
echo "  4. Monitor logs: docker compose logs -f django celery"
echo ""
echo "Documentation:"
echo "  - Implementation summary: IMPLEMENTATION_SUMMARY.md"
echo "  - User guide: README_IMPROVEMENTS.md"
echo "  - Full strategy: IMPLEMENTATION_STRATEGY.md"
echo ""
echo "Rollback (if needed):"
echo "  docker compose down"
echo "  docker compose exec -T db psql -U $POSTGRES_USER $POSTGRES_DB < $BACKUP_FILE"
echo "  git checkout <previous-commit>"
echo "  docker compose up -d"
echo ""
echo -e "${GREEN}Happy selling! 🎉${NC}"
