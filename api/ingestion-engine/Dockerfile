# Ingestion Engine - Miniconda-based Dockerfile
FROM continuumio/miniconda3:latest

WORKDIR /app

# Create conda environment with Python 3.11
RUN conda create -n ingestion python=3.11 -y && \
    conda clean -afy

# Activate environment and install pip dependencies
SHELL ["conda", "run", "-n", "ingestion", "/bin/bash", "-c"]

# Copy and install requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port for Cloud Run / Functions Framework
EXPOSE 8080

# Set conda environment activation
ENV PATH /opt/conda/envs/ingestion/bin:$PATH

# Run the functions framework (for local testing) or the main script
CMD ["sh", "-c", "functions-framework --target=ingest_grant --port=${PORT:-8080}"]
