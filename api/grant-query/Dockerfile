FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for pg8000/sqlalchemy if needed (usually none for pure python)
# But we might need build-essential for some libs.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expose port (Cloud Run ignores this, but good for docs)
EXPOSE 8080

# Run uvicorn on the port defined by Cloud Run (default 8080)
CMD sh -c "uvicorn api:app --host 0.0.0.0 --port ${PORT:-8080}"