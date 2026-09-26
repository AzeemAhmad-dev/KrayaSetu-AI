# ==============================================================================
# KrayaSetu AI - Production Multi-Stage Container Image
# SIH PS 26027 | WCR — Bhopal Division
# ==============================================================================

# --- Stage 1: Build Frontend Assets ---
FROM node:20-bookworm-slim AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build


# --- Stage 2: Production Python Backend ---
FROM python:3.12-slim AS runner

# System dependencies (including timezone data)
RUN apt-get update && apt-get install -y --no-install-recommends \
    tzdata \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Railway/India Standard Time
ENV TZ=Asia/Kolkata

RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime \
    && echo $TZ > /etc/timezone

WORKDIR /app


# --- Install Python requirements ---
COPY requirements.txt ./

RUN pip install --no-cache-dir -r requirements.txt


# --- Copy application code ---
# Main FastAPI backend
COPY backend/ ./backend/

# Vercel/FastAPI serverless entrypoint
COPY api/ ./api/

# Utility and data-generation scripts
COPY scripts/ ./scripts/

# Production SQLite database
COPY krayasetu.db ./krayasetu.db


# --- Copy built frontend ---
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist


# --- Production environment ---
ENV HOST=0.0.0.0
ENV PORT=8000
ENV ENVIRONMENT=production
ENV DATABASE_URL=sqlite:////app/krayasetu.db


# --- Network ---
EXPOSE 8000


# --- Container health check ---
HEALTHCHECK --interval=30s \
    --timeout=5s \
    --start-period=10s \
    --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1


# --- Start FastAPI ---
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]