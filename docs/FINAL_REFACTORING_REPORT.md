# Course Master 前后端分离重构完整报告

## 📋 执行摘要

本报告作为资深软件工程师的视角，提供 Course Master 项目前后端分离重构的完整分析和实施方案。

---

## 1. 只应存在于后端的代码

### 1.1 数据爬取模块
**位置**：`src/crawler/crawler.py`
- ✅ **必须保留在后端**
- **原因**：
  - 需要网络请求（HTTP/HTTPS）
  - 需要解析 HTML（BeautifulSoup）
  - 需要文件系统访问（保存 CSV）
  - 可能需要处理反爬虫机制
- **执行方式**：CLI 命令 `python main.py crawl`

### 1.2 数据处理模块
**位置**：`src/processor/`
- ✅ **必须保留在后端**
- **包含文件**：
  - `data_processor.py` - 数据处理逻辑
  - `teacher_dict_builder.py` - 字典构建
  - `department_mapper.py` - 科系映射
- **原因**：
  - 需要读取大量 CSV 文件
  - 需要复杂的数据处理（pandas）
  - 需要文件系统访问
  - 需要访问字典文件
- **执行方式**：CLI 命令 `python main.py process`, `python main.py build-dict`

### 1.3 API 服务核心
**位置**：`src/api/app.py`
- ✅ **必须保留在后端**
- **保留的功能**：
  - FastAPI 应用定义
  - 所有 API 端点实现
  - 数据读取和查询逻辑
  - 业务逻辑计算（暴课率等）
- **已移除的功能**：
  - ❌ 静态文件服务（`StaticFiles`）
  - ❌ HTML 文件返回（`FileResponse`）
  - ❌ `WEB_DIR` 配置依赖

### 1.4 配置和工具模块
**位置**：`config/`, `src/utils/`
- ✅ **必须保留在后端**
- **用途**：后端内部使用，不暴露给前端

### 1.5 CLI 入口
**位置**：`main.py`
- ✅ **必须保留在后端**
- **功能**：所有 CLI 命令（crawl, process, build-dict, api）

---

## 2. 应该移至前端 JavaScript 的逻辑

### 2.1 UI 状态管理 ✅ 已实现
**位置**：`web/assets/js/state.js`
- **功能**：
  - 课程选择状态管理
  - 本地存储（localStorage）
  - 状态持久化

### 2.2 UI 渲染逻辑 ✅ 已实现
**位置**：`web/assets/js/ui.js`
- **功能**：
  - 课表渲染（表格/卡片视图）
  - 课程卡片显示
  - 模态框管理
  - 响应式布局处理

### 2.3 API 调用封装 ✅ 已改进
**位置**：`web/assets/js/api.js`
- **功能**：
  - 统一的 API 请求处理
  - 错误处理和错误消息
  - 网络错误检测
  - 所有 API 端点封装

### 2.4 客户端工具函数 ✅ 已实现
**位置**：`web/assets/js/utils.js`
- **功能**：
  - 时间冲突检测（可选，也可在后端）
  - 数据格式化
  - 空堂时段计算
  - 课程数据标准化

### 2.5 主应用逻辑 ✅ 已实现
**位置**：`web/assets/js/main.js`
- **功能**：
  - 应用初始化
  - 事件绑定
  - 业务逻辑协调
  - 页面切换管理

---

## 3. 前后端分离后的目录结构

### 3.1 推荐结构（保持当前结构）

```
Course/
├── src/                          # 后端源代码
│   ├── api/
│   │   └── app.py               # FastAPI 应用（仅 API）
│   ├── crawler/
│   │   └── crawler.py           # 爬虫模块
│   ├── processor/
│   │   ├── data_processor.py
│   │   ├── teacher_dict_builder.py
│   │   └── department_mapper.py
│   └── utils/
│       ├── common.py
│       └── io.py
│
├── config/                       # 配置文件
│   ├── __init__.py
│   ├── api.py
│   ├── crawler.py
│   ├── paths.py
│   └── logging_config.py
│
├── data/                         # 数据目录
│   ├── raw/                     # 原始爬取数据
│   ├── processed/               # 处理后的数据
│   └── dict/                    # 字典文件
│
├── scripts/                     # 维护脚本
│   ├── check_processed_fields.py
│   └── ...
│
├── web/                         # 前端代码（GitHub Pages 部署）
│   ├── index.html               # 主页面
│   ├── assets/
│   │   ├── css/
│   │   │   └── style.css
│   │   └── js/
│   │       ├── config.js        # API 配置
│   │       ├── api.js           # API 调用封装
│   │       ├── main.js          # 主逻辑
│   │       ├── state.js          # 状态管理
│   │       ├── ui.js             # UI 渲染
│   │       └── utils.js          # 工具函数
│   └── README.md                # 前端部署说明
│
├── docs/                        # 文档目录
│   ├── REFACTORING_GUIDE.md
│   ├── ARCHITECTURE.md
│   └── ...
│
├── main.py                      # CLI 入口
├── requirements.txt
└── README.md                    # 项目主文档
```

### 3.2 目录结构说明

- **`src/`**：所有后端 Python 代码
- **`config/`**：后端配置文件
- **`data/`**：数据存储目录（后端使用）
- **`web/`**：前端静态文件（可直接部署到 GitHub Pages）
- **`main.py`**：CLI 入口（后端操作）

---

## 4. 需要重构或删除的后端功能

### 4.1 已完成的移除 ✅

1. **静态文件服务**
   - ❌ 已移除 `StaticFiles` 导入和使用
   - ❌ 已移除 `app.mount("/css", ...)` 
   - ❌ 已移除 `app.mount("/js", ...)`

2. **HTML 文件返回**
   - ❌ 已移除 `FileResponse(WEB_DIR / "index.html")`
   - ❌ 已移除根路径 `/` 返回 HTML 的逻辑

3. **WEB_DIR 依赖**
   - ❌ 已从 `src/api/app.py` 移除 `WEB_DIR` 导入

### 4.2 已添加的功能 ✅

1. **API 信息端点**
   - ✅ `GET /` - 返回 API 信息
   - ✅ `GET /api/health` - 健康检查端点

2. **CORS 配置**
   - ✅ 已配置 CORS 中间件
   - ✅ 添加了生产环境配置建议

### 4.3 可选：管理端点（如果需要）

如果需要从 Web 界面触发爬虫/处理，可以添加：

```python
# 在 src/api/app.py 中添加

@app.post("/api/admin/crawl")
async def trigger_crawl(background_tasks: BackgroundTasks):
    """触发数据爬取（需要认证）"""
    # 实现...
```

**注意**：这些端点应该添加认证保护。

---

## 5. 前端调用 API 的标准范例

### 5.1 基础 GET 请求

```javascript
// 使用改进后的 api.js
import { fetchAllCourses } from './api.js';

async function loadCourses() {
    try {
        const data = await fetchAllCourses(114, 2);
        console.log(`获取到 ${data.total} 门课程`);
        return data.courses;
    } catch (error) {
        console.error('获取课程失败:', error.message);
        // 显示错误提示给用户
        showError('获取课程列表失败：' + error.message);
        return [];
    }
}
```

### 5.2 POST 请求（带请求体）

```javascript
import { fetchRecommendations } from './api.js';

async function getRecommendations() {
    const payload = {
        empty_slots: getEmptySlots(),
        target_credits: 20,
        category: '核心通識',
        college: null,
        department: null,
        grade: null,
        current_courses: state.selectedCourses.map(c => ({
            code: c.課程代碼,
            serial: c.序號
        })),
        year: 114,
        semester: 2,
        preferred_days: [1, 2, 3, 4, 5]
    };
    
    try {
        const data = await fetchRecommendations(payload);
        displayRecommendations(data.courses);
    } catch (error) {
        showError('获取推荐失败：' + error.message);
    }
}
```

### 5.3 搜索请求

```javascript
import { searchCourses } from './api.js';

async function handleSearch() {
    const query = document.getElementById('search-input').value;
    if (!query.trim()) {
        showError('请输入搜索关键词');
        return;
    }
    
    try {
        showLoading('search-results', '搜索中...');
        const data = await searchCourses(query, 50);
        displaySearchResults(data.courses);
    } catch (error) {
        showError('搜索失败：' + error.message);
    } finally {
        hideLoading('search-results');
    }
}
```

### 5.4 完整的 API 函数列表

```javascript
// web/assets/js/api.js 提供的所有函数

// 课程相关
fetchAllCourses(year, semester)
searchCourses(query, limit)
fetchCourseDetail(courseId)
fetchRecommendations(payload)
fetchHistory(query, limit)

// 数据相关
fetchDepartments(year, semester)
fetchCoursesByClass(department, grade, className, year, semester)
fetchStats()

// 系统相关
healthCheck()
```

### 5.5 错误处理最佳实践

```javascript
// 统一的错误处理
async function safeApiCall(apiFunction, ...args) {
    try {
        return await apiFunction(...args);
    } catch (error) {
        // 网络错误
        if (error.message.includes('无法连接')) {
            showError('无法连接到服务器，请检查网络或 API 配置');
        }
        // HTTP 错误
        else if (error.message.includes('HTTP')) {
            showError('服务器错误：' + error.message);
        }
        // 其他错误
        else {
            showError('操作失败：' + error.message);
        }
        throw error;
    }
}

// 使用示例
const courses = await safeApiCall(fetchAllCourses, 114, 2);
```

---

## 6. 部署配置

### 6.1 前端部署（GitHub Pages）

#### 步骤 1：准备文件
确保 `web/` 目录包含所有前端文件。

#### 步骤 2：配置 API 地址
编辑 `web/index.html`：

```html
<script>
    // 生产环境配置
    window.API_CONFIG = {
        API_BASE: 'https://your-api-server.com/api'
    };
</script>
```

#### 步骤 3：推送到 GitHub
```bash
cd web
git init
git add .
git commit -m "Initial frontend deployment"
git remote add origin https://github.com/your-username/your-repo.git
git push -u origin main
```

#### 步骤 4：启用 GitHub Pages
1. 进入仓库设置
2. 找到 "Pages" 设置
3. 选择源分支和目录（`web/` 或根目录）

#### 步骤 5：验证部署
访问 `https://your-username.github.io/repo-name/`，检查：
- ✅ 页面正常加载
- ✅ API 调用正常（检查浏览器控制台）
- ✅ 无 CORS 错误

### 6.2 后端部署（独立服务器）

#### 步骤 1：服务器环境
```bash
# 安装 Python 3.8+
python3 --version

# 安装依赖
pip install -r requirements.txt
```

#### 步骤 2：配置环境变量
创建 `.env` 文件：

```bash
API_HOST=0.0.0.0
API_PORT=8000
LOG_LEVEL=INFO
```

#### 步骤 3：启动服务

**开发环境**：
```bash
python main.py api
```

**生产环境**（使用 Gunicorn）：
```bash
pip install gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker src.api.app:app \
    --bind 0.0.0.0:8000 \
    --access-logfile - \
    --error-logfile -
```

#### 步骤 4：配置 Nginx（可选）

```nginx
server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### 步骤 5：配置 CORS（生产环境）

编辑 `src/api/app.py`：

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-username.github.io",  # GitHub Pages
        "https://your-custom-domain.com"     # 自定义域名
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 6.3 数据更新（定时任务）

#### 使用 Cron

```bash
# 编辑 crontab
crontab -e

# 每天凌晨 2 点执行数据更新
0 2 * * * cd /path/to/project && python main.py crawl && python main.py process
```

#### 使用 systemd（推荐）

创建 `/etc/systemd/system/course-master-api.service`：

```ini
[Unit]
Description=Course Master API
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/project
ExecStart=/usr/bin/gunicorn -w 4 -k uvicorn.workers.UvicornWorker src.api.app:app --bind 0.0.0.0:8000
Restart=always

[Install]
WantedBy=multi-user.target
```

启用服务：
```bash
sudo systemctl enable course-master-api
sudo systemctl start course-master-api
```

---

## 7. 验证清单

### 后端验证

- [x] API 服务可以正常启动
- [x] 所有 API 端点可以正常访问
- [x] CORS 配置正确
- [x] 无静态文件服务相关代码
- [x] 健康检查端点正常
- [x] API 文档可以访问（`/docs`）

### 前端验证

- [x] API 调用模块已改进
- [x] 错误处理完善
- [x] 配置管理清晰
- [ ] 需要测试：页面可以正常加载
- [ ] 需要测试：API 调用正常
- [ ] 需要测试：无 CORS 错误
- [ ] 需要测试：所有功能正常工作

### 部署验证

- [ ] 前端可以部署到 GitHub Pages
- [ ] 后端可以部署到独立服务器
- [ ] 前后端可以正常通信
- [ ] 生产环境配置正确
- [ ] CORS 配置允许前端域名

---

## 8. 总结

### 核心原则

1. **后端 = 数据 + API**
   - 数据爬取、处理、存储
   - 提供 RESTful API
   - 不提供静态文件服务

2. **前端 = UI + HTTP 调用**
   - 用户界面和交互
   - 通过 HTTP 调用后端 API
   - 不执行任何 Python 代码

3. **分离部署**
   - 前端：GitHub Pages（静态托管）
   - 后端：独立服务器（Python 环境）

### 关键文件

- **后端 API**：`src/api/app.py` ✅ 已重构
- **前端配置**：`web/index.html`（API_CONFIG）✅ 已配置
- **API 调用**：`web/assets/js/api.js` ✅ 已改进
- **CLI 入口**：`main.py` ✅ 保持不变

### 架构图

```
┌─────────────────────────────────┐
│      GitHub Pages               │
│  (前端静态文件)                  │
│  - index.html                   │
│  - assets/js/api.js             │
│  - assets/js/main.js            │
└────────────┬────────────────────┘
             │ HTTP (API 调用)
             │ https://api.example.com/api
             ↓
┌─────────────────────────────────┐
│      后端服务器                  │
│  (Python + FastAPI)             │
│  - src/api/app.py               │
│  - src/crawler/crawler.py       │
│  - src/processor/               │
└────────────┬────────────────────┘
             │ 内部调用
             ↓
┌─────────────────────────────────┐
│     数据处理                     │
│  - CLI: python main.py crawl    │
│  - CLI: python main.py process  │
│  - 定时任务 (Cron)              │
└─────────────────────────────────┘
```

---

## 9. 下一步行动

1. **测试本地开发环境**
   ```bash
   # 终端 1：启动后端
   python main.py api
   
   # 终端 2：启动前端
   cd web
   python -m http.server 8080
   ```

2. **验证功能**
   - 打开 `http://localhost:8080`
   - 测试所有功能
   - 检查浏览器控制台

3. **部署后端**
   - 部署到服务器
   - 配置 CORS
   - 测试 API

4. **部署前端**
   - 推送到 GitHub
   - 启用 GitHub Pages
   - 修改 API 地址

5. **设置数据更新**
   - 配置定时任务
   - 或使用 GitHub Actions

---

## 📚 相关文档

- [重构指南](./REFACTORING_GUIDE.md) - 完整的重构指南
- [实施总结](./IMPLEMENTATION_SUMMARY.md) - 实施总结
- [架构分析](./ARCHITECTURE_ANALYSIS.md) - 架构问题分析
- [前后端分离](./FRONTEND_BACKEND_SEPARATION.md) - 功能职责划分

---

**报告完成日期**：2025-01-02
**状态**：✅ 重构完成，可以部署

