import { useEffect, useState } from 'react'

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export default function App() {
  const [health, setHealth] = useState(null)
  const [tasks, setTasks] = useState([])
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const fetchAll = async () => {
    try {
      setError('')
      const [hRes, tRes] = await Promise.all([
        fetch(`${API_BASE}/api/health`),
        fetch(`${API_BASE}/api/tasks`),
      ])
      if (!hRes.ok || !tRes.ok) {
        throw new Error('后端接口响应异常，请检查后端是否已启动')
      }
      const [hData, tData] = await Promise.all([hRes.json(), tRes.json()])
      setHealth(hData)
      setTasks(tData)
    } catch (err) {
      setError(err.message || '无法连接后端服务')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, note }),
      })
      if (!res.ok) throw new Error('新增失败')
      setTitle('')
      setNote('')
      await fetchAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggle = async (id) => {
    await fetch(`${API_BASE}/api/tasks/${id}/toggle`, { method: 'PATCH' })
    await fetchAll()
  }

  const handleDelete = async (id) => {
    await fetch(`${API_BASE}/api/tasks/${id}`, { method: 'DELETE' })
    await fetchAll()
  }

  return (
    <div className="page">
      <div className="container">
        <header className="hero">
          <div>
            <span className="badge">Antigravity × Railway · 单域名合体模式 v2.0</span>
            <h1>React + FastAPI + MySQL 全栈测试台（单服务一体版）</h1>
            <p className="subtitle">
              前后端已合二为一：全项目仅运行 1 个 Python 容器、仅需绑定 1 个域名、同源零跨域！
            </p>
          </div>
          <div className="status-card">
            <div className="status-row">
              <span className={`dot ${health?.status === 'ok' ? 'online' : 'offline'}`} />
              <strong>{health?.status === 'ok' ? '后端已连通' : '等待连接后端'}</strong>
            </div>
            <div className="meta">运行环境：{health?.environment || '检测中...'}</div>
            <div className="meta">当前数据库：{health?.database_type || '检测中...'}</div>
          </div>
        </header>

        {error && <div className="error-banner">{error}</div>}

        <form className="task-form" onSubmit={handleAdd}>
          <input
            type="text"
            placeholder="输入一条测试任务或留言（写入数据库）..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="备注说明（可选，可在 Navicat 中实时查看）"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button type="submit" disabled={submitting}>
            {submitting ? '写入中...' : '+ 写入数据库'}
          </button>
        </form>

        <section className="task-list">
          <div className="section-header">
            <h2>数据库实时记录（共 {tasks.length} 条）</h2>
            <button type="button" className="refresh-btn" onClick={fetchAll}>
              刷新数据
            </button>
          </div>

          {loading ? (
            <div className="empty">正在读取数据...</div>
          ) : tasks.length === 0 ? (
            <div className="empty">数据库当前为空，在上方添加第一条记录试试吧！</div>
          ) : (
            <ul>
              {tasks.map((item) => (
                <li key={item.id} className={item.completed ? 'done' : ''}>
                  <div className="task-main" onClick={() => handleToggle(item.id)}>
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => {}}
                    />
                    <div>
                      <div className="task-title">
                        <span className="id-tag">#{item.id}</span> {item.title}
                      </div>
                      {item.note && <div className="task-note">{item.note}</div>}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="delete-btn"
                    onClick={() => handleDelete(item.id)}
                  >
                    删除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
