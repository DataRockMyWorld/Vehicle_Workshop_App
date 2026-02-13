# Vehicle Workshop App - production-ready multi-stage build
# Note: syntax directive removed to avoid auth.docker.io fetch behind corporate proxy

# ---- builder ----
FROM python:3.11-slim as builder

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
       build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*


COPY backend/requirements.txt .
RUN pip wheel --no-deps -w /wheels -r requirements.txt

# ---- runtime ----
FROM python:3.11-slim as runtime

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
       libpq5 curl \
    && rm -rf /var/lib/apt/lists/*
   

COPY --from=builder /wheels /wheels
RUN pip install --no-cache /wheels/* && rm -rf /wheels

# Create non-root user for running the app
RUN groupadd --gid 1000 appuser \
    && useradd --uid 1000 --gid appuser --shell /bin/bash --create-home appuser

COPY --chown=appuser:appuser backend/ .
RUN chmod +x scripts/entrypoint.sh

USER appuser

EXPOSE 8000

ENTRYPOINT ["./scripts/entrypoint.sh"]
CMD ["gunicorn", "core.wsgi:application", "-b", "0.0.0.0:8000", "-w", "4", "-k", "sync", "--worker-tmp-dir", "/dev/shm", "--access-logfile", "-", "--error-logfile", "-", "--capture-output", "--enable-stdio-inheritance"]
