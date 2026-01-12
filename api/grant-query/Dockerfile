FROM continuumio/miniconda3

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y build-essential

# Pre-create the conda environment
COPY environment.yml .
RUN conda env create -f environment.yml

# Ensure the environment is activated by default in the shell
RUN echo "conda activate grant-query" >> ~/.bashrc
ENV PATH /opt/conda/envs/grant-query/bin:$PATH

EXPOSE 8000