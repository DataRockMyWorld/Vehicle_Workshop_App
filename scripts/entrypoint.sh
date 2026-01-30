#!/bin/bash
set -e

wait_for_port() {
    local host="$1"
    local port="$2"
    local name="${3:-Service}"
    echo "Waiting for $name at $host:$port ..."
    python -c "
import socket, time
while True:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(2)
        s.connect(('$host', $port))
        s.close()
        print('$name is up.')
        break
    except Exception:
        time.sleep(1)
"
}

# Wait for Postgres when using PostgreSQL (Docker Compose)
if [ -n "${DATABASE_URL}" ] && [[ "${DATABASE_URL}" == postgres* ]]; then
    DB_HOST="${POSTGRES_HOST:-db}"
    DB_PORT="${POSTGRES_PORT:-5432}"
    wait_for_port "$DB_HOST" "$DB_PORT" "PostgreSQL"
fi

# Wait for Redis when using Redis as broker
if [ -n "${CELERY_BROKER_URL}" ] && [[ "${CELERY_BROKER_URL}" == redis* ]]; then
    REDIS_HOST="${REDIS_HOST:-redis}"
    REDIS_PORT="${REDIS_PORT:-6379}"
    wait_for_port "$REDIS_HOST" "$REDIS_PORT" "Redis"
fi

python manage.py migrate --noinput
python manage.py collectstatic --noinput --clear 2>/dev/null || true

exec "$@"
