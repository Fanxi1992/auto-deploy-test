# Auto Deploy Test (React + FastAPI + MySQL)

用于演示 **Antigravity + GitHub + Railway** 全栈一键开发与部署流程：

- `frontend/`: React 18 + Vite 前端
- `backend/`: Python FastAPI + SQLAlchemy + PyMySQL 后端（本地无配置时自动降级为 SQLite 快速联调，配置 `DATABASE_URL` 或部署到 Railway 后自动连接云端 MySQL）
