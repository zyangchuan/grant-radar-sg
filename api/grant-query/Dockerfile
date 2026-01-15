# Grant Query Service - Miniconda-based Dockerfile
FROM continuumio/miniconda3:latest

WORKDIR /app

# Create conda environment with Python 3.11
RUN conda create -n grantquery python=3.11 -y && \
    conda clean -afy

# Activate environment and install pip dependencies
SHELL ["conda", "run", "-n", "grantquery", "/bin/bash", "-c"]

# Copy and install requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port for Cloud Run
EXPOSE 8080

# Set conda environment activation and run uvicorn
ENV PATH /opt/conda/envs/grantquery/bin:$PATH
CMD ["sh", "-c", "uvicorn api:app --host 0.0.0.0 --port ${PORT:-8080}"]