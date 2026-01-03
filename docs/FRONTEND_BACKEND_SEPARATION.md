# 前后端分离架构 - 功能职责划分

## 🎯 核心问题

**问题**：尝试将项目部署到 GitHub Pages，但发现无法通过 `index.html` 启动系统流程（如 `crawl`、`process`）。

**根本原因**：GitHub Pages 只能托管静态文件（HTML/CSS/JavaScript），无法执行 Python 代码。

---

## 📊 功能职责划分表

### ✅ 后端职责（服务器端，Python）

| 功能 | CLI 命令 | 是否应该通过 API 暴露 | 说明 |
|------|----------|---------------------|------|
| **数据爬取** | `python main.py crawl` | ⚠️ 可选 | 需要网络请求、文件系统访问 |
| **数据处理** | `python main.py process` | ⚠️ 可选 | 需要读取/写入文件、复杂计算 |
| **构建字典** | `python main.py build-dict` | ⚠️ 可选 | 需要文件系统访问 |
| **API 服务** | `python main.py api` | ✅ 必须 | 提供 HTTP API 端点 |
| **数据查询** | - | ✅ 已实现 | `/api/courses/*` 等端点 |

### ✅ 前端职责（浏览器端，JavaScript）

| 功能 | 实现方式 | 说明 |
|------|----------|------|
| **用户界面** | HTML/CSS/JavaScript | 展示和交互 |
| **调用 API** | `fetch()` 或 `axios` | 通过 HTTP 获取数据 |
| **课程搜索** | `GET /api/courses/search` | ✅ 已实现 |
| **课程推荐** | `POST /api/courses/recommend` | ✅ 已实现 |
| **获取课程列表** | `GET /api/courses/all` | ✅ 已实现 |
| **获取历史数据** | `GET /api/courses/history` | ✅ 已实现 |
| **获取统计数据** | `GET /api/courses/stats` | ✅ 已实现 |

### ❌ 前端不应该做的事情

| 操作 | 原因 |
|------|------|
| ❌ 执行 Python 代码 | 浏览器无法运行 Python |
| ❌ 直接访问文件系统 | 安全限制，无法访问服务器文件 |
| ❌ 执行爬虫 | 需要网络请求和文件写入 |
| ❌ 处理大量数据 | 浏览器性能限制 |
| ❌ 直接调用 `main.py` | 无法在浏览器中执行 CLI 命令 |

---

## 🔍 当前架构分析

### CLI 模式（当前）

```
用户 → main.py → [crawl|process|build-dict|api]
```

**执行位置**：服务器端（命令行）

**适用场景**：
- ✅ 本地开发
- ✅ 服务器端手动执行
- ✅ 定时任务（Cron）

### Web 模式（目标）

```
浏览器 → index.html (GitHub Pages)
  ↓ HTTP 请求
后端 API (独立服务器)
  ↓ 内部调用
crawl/process 功能
```

**执行位置**：
- 前端：浏览器（GitHub Pages）
- 后端：独立服务器

---

## 🛠️ 解决方案

### 方案 1：保持 CLI 模式 + 分离部署（推荐）

**适用场景**：数据更新频率固定（如每学期一次）

**实施方式**：

1. **后端部署**：
   ```bash
   # 在服务器上运行 API
   python main.py api
   
   # 使用定时任务更新数据
   # Cron: 0 2 * * * python main.py crawl && python main.py process
   ```

2. **前端部署**：
   - 部署到 GitHub Pages
   - 配置 API 地址为后端服务器地址

3. **前端只调用数据查询 API**：
   ```javascript
   // 前端只调用这些端点
   GET /api/courses/all
   GET /api/courses/search
   POST /api/courses/recommend
   // ... 其他查询端点
   ```

**优点**：
- ✅ 简单直接
- ✅ 安全性高（不暴露管理端点）
- ✅ 适合定期更新数据的场景

### 方案 2：添加管理 API 端点

**适用场景**：需要从 Web 界面手动触发数据更新

**实施方式**：

1. **添加管理端点**（需要认证）：
   ```python
   @app.post("/api/admin/crawl")  # 需要 API Key 认证
   @app.post("/api/admin/process")  # 需要 API Key 认证
   ```

2. **前端调用管理端点**：
   ```javascript
   // 需要认证
   fetch('/api/admin/crawl', {
       method: 'POST',
       headers: {
           'X-API-Key': 'your-secret-key'
       }
   })
   ```

**优点**：
- ✅ 可以从 Web 界面触发
- ✅ 灵活性高

**缺点**：
- ⚠️ 需要实现认证
- ⚠️ 需要处理长时间运行的任务
- ⚠️ 需要提供任务状态查询

---

## 📋 具体实施步骤

### 步骤 1：确认后端 API 正常运行

```bash
# 启动后端 API
python main.py api

# 测试 API 端点
curl http://localhost:8000/api/health
curl http://localhost:8000/api/courses/stats
```

### 步骤 2：配置前端 API 地址

编辑 `web/index.html`：

```html
<script>
    window.API_CONFIG = {
        // 开发环境
        API_BASE: 'http://localhost:8000/api'
        
        // 生产环境（部署到 GitHub Pages 后）
        // API_BASE: 'https://your-api-server.com/api'
    };
</script>
```

### 步骤 3：测试前端调用 API

在浏览器中打开前端页面，检查：
- ✅ 课程搜索功能
- ✅ 课程推荐功能
- ✅ 历史数据查询功能
- ✅ 浏览器控制台没有 CORS 错误

### 步骤 4：部署后端

将后端部署到支持 Python 的服务器：
- VPS（如 DigitalOcean、Linode）
- 云服务（如 Heroku、Railway、Render）
- Docker 容器

### 步骤 5：部署前端到 GitHub Pages

1. 将 `web/` 目录内容推送到 GitHub
2. 在仓库设置中启用 GitHub Pages
3. 修改前端配置中的 API 地址为生产环境地址

### 步骤 6：设置数据更新（可选）

如果需要定期更新数据：

```bash
# 使用 Cron 定时任务
0 2 * * * cd /path/to/project && python main.py crawl && python main.py process
```

或使用 GitHub Actions（如果代码在 GitHub）：

```yaml
# .github/workflows/update-data.yml
name: Update Course Data
on:
  schedule:
    - cron: '0 2 * * *'  # 每天 UTC 2 点
jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run crawler
        run: python main.py crawl && python main.py process
```

---

## 🎯 总结

### 核心原则

1. **GitHub Pages = 静态文件托管**
   - 只能托管 HTML/CSS/JavaScript
   - 无法执行 Python 代码
   - 无法访问文件系统

2. **后端操作 = 服务器端执行**
   - `crawl`、`process`、`build-dict` 必须在服务器端执行
   - 可以通过 API 端点触发，但不能在浏览器中直接执行

3. **前端 = 用户界面 + HTTP 调用**
   - 只负责 UI 和通过 HTTP 调用后端 API
   - 不直接执行服务器端操作

### 推荐架构

```
┌─────────────────┐
│  GitHub Pages   │  ← 前端（静态文件）
│  (index.html)   │
└────────┬────────┘
         │ HTTP (API 调用)
         ↓
┌─────────────────┐
│  后端服务器      │  ← 后端（Python + FastAPI）
│  (main.py api)  │
└────────┬────────┘
         │ 内部调用
         ↓
┌─────────────────┐
│  crawl/process  │  ← 数据处理（CLI 或 API 触发）
│  build-dict     │
└─────────────────┘
```

### 关键点

- ✅ **前端只调用数据查询 API**（已实现）
- ✅ **后端提供 API 服务**（已实现）
- ⚠️ **数据更新通过 CLI 或管理 API**（根据需求选择）
- ✅ **前后端分离部署**（前端 GitHub Pages，后端独立服务器）

---

## 📚 相关文档

- [架构问题分析](./ARCHITECTURE_ANALYSIS.md) - 详细的问题分析
- [API 端点设计指南](./API_ENDPOINTS_GUIDE.md) - 如何添加管理端点
- [架构设计文档](./ARCHITECTURE.md) - 整体架构设计
- [迁移指南](./MIGRATION.md) - 迁移步骤

