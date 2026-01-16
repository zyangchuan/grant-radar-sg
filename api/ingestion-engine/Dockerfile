# Ingestion Engine - Miniconda-based Dockerfile
FROM continuumio/miniconda3:latest

WORKDIR /app

# Copy environment file
COPY environment.yml .

# Create conda environment
# Using --name ingestion-engine to match the name in environment.yml, or overriding it
# We'll stick to the name defined in the file, but ensure we know what it is.
# The environment.yml defines name: ingestion-engine
RUN conda env create -f environment.yml && \
    conda clean -afy

# Activate environment
# We need to set the path so that subsequent commands and the entrypoint use the environment
ENV PATH /opt/conda/envs/ingestion-engine/bin:$PATH
# Also set CONDA_DEFAULT_ENV
ENV CONDA_DEFAULT_ENV ingestion-engine

# Copy application code
COPY . .

# Expose port for Cloud Run / Functions Framework
EXPOSE 8080

# Run the functions framework
CMD ["functions-framework", "--target=ingest_grant", "--port=8080"]
