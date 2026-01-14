FROM continuumio/miniconda3:latest

WORKDIR /app

COPY environment.yml .
RUN conda env create -f environment.yml

SHELL ["conda", "run", "-n", "grant_query", "/bin/bash", "-c"]

COPY . .

RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2'); print('Model downloaded successfully!')"

EXPOSE 8000

ENTRYPOINT ["conda", "run", "--no-capture-output", "-n", "grant_query"]
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]