# Grant Query Service - Cloud Run optimized Dockerfile
FROM continuumio/miniconda3

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy environment file
COPY environment.yml .

# Create conda environment
RUN conda env create -f environment.yml

# Make RUN commands use the new environment
SHELL ["conda", "run", "-n", "grant_query", "/bin/bash", "-c"]

# Copy application code
COPY . .

# Expose port (Cloud Run uses PORT env var)
EXPOSE 8080

# Run uvicorn on the port defined by Cloud Run (default 8080)
# Note: We use "conda run" to execute the command in the environment
CMD ["conda", "run", "--no-capture-output", "-n", "grant_query", "uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8080"]