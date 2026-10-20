# Stage 1: Build Frontend (React + Vite)
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Python Backend with Gunicorn
FROM python:3.11-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application, database, and qualification data
COPY backend/ ./backend/
COPY data/ ./data/
COPY References/ ./References/
COPY Data_Qualification_Register_11-Oct-2026.xlsx ./
COPY run.py ./

# Copy compiled frontend dist from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

ENV PORT=5000
EXPOSE 5000

CMD ["sh", "-c", "gunicorn run:app --bind 0.0.0.0:${PORT:-5000} --workers 2 --timeout 120"]
