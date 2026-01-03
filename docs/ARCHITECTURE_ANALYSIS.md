# 前后端分离架构问题分析

## 🔍 当前架构问题分析

### 问题核心

您遇到的问题是：**GitHub Pages 只能托管静态文件，无法执行 Python 代码**。

当您尝试通过 `index.html` 启动系统流程时，会遇到以下问题：

1. ❌ **无法执行 Python 代码**：GitHub Pages 只提供静态文件服务，不能运行 `main.py`
2. ❌ **无法访问文件系统**：前端 JavaScript 无法直接访问服务器的文件系统
3. ❌ **无法执行爬虫**：爬虫需要网络请求和文件写入，只能在服务器端执行
4. ❌ **无法处理数据**：数据处理需要读取 CSV 文件、处理数据、写入文件，只能在服务器端执行

### 根本原因

当前架构中，`main.py` 的 CLI 命令（`crawl`、`process`、`build-dict`）都是**服务器端操作**，这些操作：

- 需要访问文件系统（读取/写入 CSV 文件）
- 需要执行网络请求（爬虫）
- 需要运行 Python 代码
- 需要服务器资源（CPU、内存、磁盘）

这些操作**无法在浏览器中执行**，也无法通过 GitHub Pages 执行。

---

## 📊 功能职责划分

### ✅ 后端应该负责的功能（服务器端）

#### 1. **数据爬取** (`crawl`)
- **原因**：
  - 需要网络请求（HTTP/HTTPS）
  - 需要解析 HTML（BeautifulSoup）
  - 需要写入文件系统（保存 CSV）
  - 可能需要处理反爬虫机制
- **执行方式**：
  - CLI 命令：`python main.py crawl`
  - 或通过 API 端点触发（需要添加）

#### 2. **数据处理** (`process`)
- **原因**：
  - 需要读取大量 CSV 文件
  - 需要复杂的数据处理逻辑（pandas）
  - 需要写入处理后的数据
  - 需要访问字典文件
- **执行方式**：
  - CLI 命令：`python main.py process`
  - 或通过 API 端点触发（需要添加）

#### 3. **构建字典** (`build-dict`)
- **原因**：
  - 需要分析数据模式
  - 需要文件系统访问
  - 需要数据处理逻辑
- **执行方式**：
  - CLI 命令：`python main.py build-dict`
  - 或通过 API 端点触发（需要添加）

#### 4. **API 服务** (`api`)
- **原因**：
  - 需要读取数据文件
  - 需要提供 HTTP API
  - 需要处理业务逻辑
- **执行方式**：
  - CLI 命令：`python main.py api`
  - 或作为服务持续运行

### ✅ 前端应该负责的功能（浏览器端）

#### 1. **用户界面**
- HTML/CSS/JavaScript
- 用户交互
- 表单输入
- 数据展示

#### 2. **通过 HTTP 调用后端 API**
- 课程搜索：`GET /api/courses/search`
- 课程推荐：`POST /api/courses/recommend`
- 获取课程列表：`GET /api/courses/all`
- 获取历史数据：`GET /api/courses/history`
- 获取统计数据：`GET /api/courses/stats`

#### 3. **客户端数据处理**
- 课程表渲染
- 时间冲突检测（可选，也可以在后端）
- 本地存储（localStorage）
- UI 状态管理

### ❌ 前端不应该负责的功能

1. ❌ **直接执行爬虫**：无法在浏览器中执行 Python 爬虫
2. ❌ **直接处理数据**：无法访问服务器文件系统
3. ❌ **直接构建字典**：需要服务器端资源
4. ❌ **直接访问数据库/文件**：安全性和权限问题

---

## 🔧 解决方案

### 方案 1：通过 API 端点触发后端操作（推荐）

如果需要在 Web 界面中触发 `crawl`、`process` 等操作，应该：

1. **在后端添加 API 端点**：
   ```python
   @app.post("/api/admin/crawl")
   async def trigger_crawl():
       # 执行爬虫
       from crawler.crawler import main as crawl_main
       crawl_main()
       return {"status": "success", "message": "爬虫执行完成"}
   
   @app.post("/api/admin/process")
   async def trigger_process():
       # 执行数据处理
       from processor.data_processor import main as process_main
       process_main()
       return {"status": "success", "message": "数据处理完成"}
   ```

2. **前端通过 HTTP 调用**：
   ```javascript
   async function triggerCrawl() {
       const response = await fetch('http://localhost:8000/api/admin/crawl', {
           method: 'POST'
       });
       const result = await response.json();
       console.log(result);
   }
   ```

3. **注意事项**：
   - ⚠️ **安全性**：这些端点应该添加认证（API Key、JWT 等）
   - ⚠️ **异步处理**：长时间运行的任务应该使用后台任务（Celery、RQ 等）
   - ⚠️ **状态反馈**：提供任务状态查询端点

### 方案 2：使用定时任务（推荐用于生产环境）

对于定期执行的任务（如每天爬取新数据），应该：

1. **使用 Cron 或定时任务**：
   ```bash
   # 每天凌晨 2 点执行爬虫
   0 2 * * * cd /path/to/project && python main.py crawl && python main.py process
   ```

2. **或使用 GitHub Actions**（如果使用 GitHub）：
   ```yaml
   name: Daily Crawl
   on:
     schedule:
       - cron: '0 2 * * *'  # 每天 UTC 2 点
   jobs:
     crawl:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v2
         - name: Run crawler
           run: python main.py crawl
   ```

### 方案 3：分离部署

1. **后端部署**：
   - 部署到支持 Python 的服务器（VPS、云服务器等）
   - 或使用 Docker 容器
   - 或使用云服务（Heroku、Railway、Render 等）

2. **前端部署**：
   - GitHub Pages（静态文件）
   - Netlify
   - Vercel
   - 任何静态托管服务

3. **配置前端 API 地址**：
   ```javascript
   // web/index.html
   window.API_CONFIG = {
       API_BASE: 'https://your-api-server.com/api'
   };
   ```

---

## 📋 具体实施建议

### 当前架构（CLI 模式）

```
用户 → main.py → crawl/process/api
```

**适用场景**：
- 本地开发
- 服务器端手动执行
- 定时任务（Cron）

### 目标架构（前后端分离）

```
前端（GitHub Pages）
  ↓ HTTP
后端 API（独立服务器）
  ↓ 内部调用
crawl/process 功能
```

**实施步骤**：

1. ✅ **后端保持 CLI 功能**（用于服务器端操作）
2. ✅ **添加 API 端点**（如果需要从 Web 界面触发）
3. ✅ **前端只通过 HTTP 调用 API**（不直接执行 Python 代码）
4. ✅ **分离部署**（前端 GitHub Pages，后端独立服务器）

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

### 推荐方案

1. **开发环境**：
   - 后端：`python main.py api`（本地运行）
   - 前端：`python -m http.server`（本地运行）

2. **生产环境**：
   - 后端：部署到支持 Python 的服务器，运行 `python main.py api`
   - 前端：部署到 GitHub Pages，配置 API 地址为后端服务器地址

3. **数据更新**：
   - 使用定时任务（Cron）定期执行 `crawl` 和 `process`
   - 或通过 API 端点手动触发（需要认证）

### 下一步行动

1. ✅ 确认后端 API 正常运行
2. ✅ 确认前端可以正常调用 API
3. ⏳ 如果需要从 Web 界面触发爬虫/处理，添加相应的 API 端点
4. ⏳ 配置生产环境的 API 地址
5. ⏳ 部署后端到独立服务器
6. ⏳ 部署前端到 GitHub Pages

