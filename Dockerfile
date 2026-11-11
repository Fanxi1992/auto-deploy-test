# 第一阶段：临时使用 Node.js 22 把 React 前端编译成静态文件 dist
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# 第二阶段：清爽的 Python 3.12 线上运行环境（不含 Node.js，省内存省费用）
FROM python:3.12-slim
WORKDIR /app/backend
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./
# 将第一阶段打包好的 React 静态文件搬进后端 static 目录，由 FastAPI 一体托管
COPY --from=frontend-builder /app/frontend/dist ./static

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
