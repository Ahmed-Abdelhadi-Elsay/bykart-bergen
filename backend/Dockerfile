FROM python:3.12-slim AS base
WORKDIR /app
RUN pip install --no-cache-dir uv
COPY requirements.txt .
RUN uv pip install --no-cache-dir -r requirements.txt --python /usr/local/bin/python3
COPY app/ ./app/

FROM base AS runtime
EXPOSE 8000
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
