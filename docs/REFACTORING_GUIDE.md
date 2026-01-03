# Course Master 前后端分离重构完整指南

## 📋 目录

1. [代码职责分析](#1-代码职责分析)
2. [目录结构设计](#2-目录结构设计)
3. [后端重构清单](#3-后端重构清单)
4. [前端重构清单](#4-前端重构清单)
5. [API 调用标准范例](#5-api-调用标准范例)
6. [部署配置](#6-部署配置)

---

## 1. 代码职责分析

### ✅ 只应存在于后端的代码

#### 1.1 数据爬取模块
**位置**：`src/crawler/crawler.py`
- ✅ **保留**：需要网络请求、文件系统访问
- ✅ **CLI 命令**：`python main.py crawl`
- ❌ **不应暴露给前端**：前端无法执行 Python 代码

#### 1.2 数据处理模块
**位置**：`src/processor/`
- ✅ **保留**：
  - `data_processor.py` - 数据处理逻辑
  - `teacher_dict_builder.py` - 字典构建
  - `department_mapper.py` - 科系映射
- ✅ **CLI 命令**：`python main.py process`, `python main.py build-dict`
- ❌ **不应暴露给前端**：需要文件系统访问、复杂计算

#### 1.3 API 服务核心
**位置**：`src/api/app.py`
- ✅ **保留**：
  - FastAPI 应用定义
  - API 端点实现
  - 数据读取和查询逻辑
  - 业务逻辑计算（如暴课率计算）
- ✅ **移除**：
  - ~~静态文件服务（`StaticFiles`）~~ ✅ 已移除
  - ~~HTML 文件返回（`FileResponse`）~~ ✅ 已移除

#### 1.4 配置和工具
**位置**：`config/`, `src/utils/`
- ✅ **保留**：所有配置和工具函数
- ✅ **用途**：后端内部使用

#### 1.5 CLI 入口
**位置**：`main.py`
- ✅ **保留**：所有 CLI 命令
- ✅ **用途**：服务器端操作

### ✅ 应该移至前端的逻辑

#### 1.1 UI 状态管理
**位置**：`web/assets/js/state.js`
- ✅ **已实现**：课程选择状态、本地存储
- ✅ **保持**：前端状态管理

#### 1.2 UI 渲染逻辑
**位置**：`web/assets/js/ui.js`
- ✅ **已实现**：课表渲染、卡片显示
- ✅ **保持**：所有 UI 相关逻辑

#### 1.3 客户端工具函数
**位置**：`web/assets/js/utils.js`
- ✅ **应包含**：
  - 时间冲突检测（可选，也可在后端）
  - 数据格式化
  - 空堂时段计算
  - 课程数据标准化

#### 1.4 API 调用封装
**位置**：`web/assets/js/api.js`
- ✅ **已实现**：API 调用函数
- ✅ **需要完善**：错误处理、重试机制

---

## 2. 目录结构设计

### 📁 推荐的前后端分离目录结构

```
Course/
├── backend/                          # 后端代码（可选：保持当前结构或重组）
│   ├── src/
│   │   ├── api/
│   │   │   └── app.py               # FastAPI 应用（仅 API，无静态文件）
│   │   ├── crawler/
│   │   │   └── crawler.py           # 爬虫模块
│   │   ├── processor/
│   │   │   ├── data_processor.py
│   │   │   ├── teacher_dict_builder.py
│   │   │   └── department_mapper.py
│   │   └── utils/
│   │       ├── common.py
│   │       └── io.py
│   ├── config/                       # 配置文件
│   │   ├── __init__.py
│   │   ├── api.py
│   │   ├── crawler.py
│   │   ├── paths.py
│   │   └── logging_config.py
│   ├── data/                         # 数据目录
│   │   ├── raw/                     # 原始数据
│   │   ├── processed/               # 处理后的数据
│   │   └── dict/                    # 字典文件
│   ├── scripts/                     # 维护脚本
│   ├── main.py                      # CLI 入口
│   ├── requirements.txt
│   └── README.md                    # 后端说明文档
│
├── frontend/                         # 前端代码（GitHub Pages 部署）
│   ├── index.html                   # 主页面
│   ├── assets/
│   │   ├── css/
│   │   │   └── style.css
│   │   └── js/
│   │       ├── config.js           # API 配置
│   │       ├── api.js              # API 调用封装
│   │       ├── main.js             # 主逻辑
│   │       ├── state.js            # 状态管理
│   │       ├── ui.js                # UI 渲染
│   │       └── utils.js           # 工具函数
│   ├── .gitignore
│   └── README.md                   # 前端部署说明
│
├── docs/                             # 文档目录
│   ├── ARCHITECTURE.md
│   ├── REFACTORING_GUIDE.md        # 本文件
│   └── ...
│
├── .gitignore
└── README.md                        # 项目主文档
```

### 📝 当前结构 vs 推荐结构

**当前结构**（可保持）：
- `src/` - 后端代码
- `web/` - 前端代码
- `config/` - 配置
- `data/` - 数据

**推荐结构**（更清晰）：
- `backend/` - 所有后端代码（可选重组）
- `frontend/` - 前端代码（将 `web/` 重命名）

**建议**：如果项目已经运行良好，可以保持当前结构，只需确保职责清晰即可。

---

## 3. 后端重构清单

### ✅ 已完成的重构

1. ✅ **移除静态文件服务**
   - 已移除 `StaticFiles`
   - 已移除 `FileResponse` 返回 HTML

2. ✅ **添加 API 信息端点**
   - `/` - API 信息
   - `/api/health` - 健康检查

3. ✅ **CORS 配置**
   - 已配置 CORS 中间件
   - 添加了生产环境建议

### ⚠️ 需要检查的项目

#### 3.1 确认无静态文件引用

检查 `src/api/app.py` 中是否还有：
- ❌ `StaticFiles` 导入和使用
- ❌ `FileResponse` 用于返回 HTML
- ❌ `WEB_DIR` 的引用（如果不再需要）

#### 3.2 确认 API 端点完整

当前已实现的端点：
- ✅ `GET /api/courses/all` - 获取所有课程
- ✅ `GET /api/courses/search` - 搜索课程
- ✅ `POST /api/courses/recommend` - 推荐课程
- ✅ `GET /api/courses/history` - 历史数据
- ✅ `GET /api/courses/stats` - 统计
- ✅ `GET /api/departments` - 科系列表

#### 3.3 可选：添加管理端点（如果需要）

如果需要从 Web 界面触发爬虫/处理：

```python
# 在 src/api/app.py 中添加

from fastapi import BackgroundTasks, Depends, Header, HTTPException
from typing import Optional

# API Key 认证（生产环境必须）
API_KEY = os.getenv("API_KEY", "your-secret-key")

async def verify_api_key(x_api_key: str = Header(..., alias="X-API-Key")):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API Key")
    return x_api_key

@app.post("/api/admin/crawl")
async def trigger_crawl(
    background_tasks: BackgroundTasks,
    api_key: str = Depends(verify_api_key)
):
    """触发数据爬取（需要认证）"""
    def run_crawl():
        from crawler.crawler import main as crawl_main
        crawl_main()
    
    background_tasks.add_task(run_crawl)
    return {"status": "started", "message": "爬虫任务已启动"}

@app.post("/api/admin/process")
async def trigger_process(
    background_tasks: BackgroundTasks,
    api_key: str = Depends(verify_api_key)
):
    """触发数据处理（需要认证）"""
    def run_process():
        from processor.data_processor import main as process_main
        process_main()
    
    background_tasks.add_task(run_process)
    return {"status": "started", "message": "数据处理任务已启动"}
```

### 🗑️ 可以删除的代码

1. **旧版代码**（如果不再需要）：
   - `archive/app_old.py`
   - `archive/backup/`

2. **未使用的导入**：
   - 检查 `src/api/app.py` 中是否有未使用的导入

---

## 4. 前端重构清单

### ✅ 已实现的功能

1. ✅ **API 调用封装** - `web/assets/js/api.js`
2. ✅ **状态管理** - `web/assets/js/state.js`
3. ✅ **UI 渲染** - `web/assets/js/ui.js`
4. ✅ **主逻辑** - `web/assets/js/main.js`
5. ✅ **配置管理** - `web/assets/js/config.js`

### ⚠️ 需要完善的功能

#### 4.1 API 调用错误处理

**当前**：`web/assets/js/api.js` 只有基本的错误处理

**建议改进**：

```javascript
// web/assets/js/api.js

/**
 * 统一的 API 请求处理
 */
async function apiRequest(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(error.detail || `HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Request failed:', error);
        throw error;
    }
}

export async function fetchAllCourses(year, semester) {
    return apiRequest(`${API_BASE}/courses/all?year=${year}&semester=${semester}`);
}

export async function fetchRecommendations(payload) {
    return apiRequest(`${API_BASE}/courses/recommend`, {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}
```

#### 4.2 加载状态管理

**建议添加**：

```javascript
// web/assets/js/ui.js 或新建 loading.js

export function showLoading(elementId, message = '加载中...') {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">${message}</span>
                </div>
                <p class="mt-3 text-muted">${message}</p>
            </div>
        `;
    }
}

export function hideLoading(elementId, content = '') {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = content;
    }
}
```

#### 4.3 错误提示统一处理

**建议添加**：

```javascript
// web/assets/js/utils.js 或新建 error.js

import Swal from 'sweetalert2';

export function showError(message, title = '错误') {
    Swal.fire({
        icon: 'error',
        title: title,
        text: message,
        confirmButtonText: '确定'
    });
}

export function showSuccess(message, title = '成功') {
    Swal.fire({
        icon: 'success',
        title: title,
        text: message,
        timer: 2000,
        showConfirmButton: false
    });
}
```

### 🗑️ 可以清理的代码

1. **旧版 JavaScript**：
   - `web/assets/js/old.js` - 如果不再使用，可以删除或移到 `archive/`

2. **未使用的函数**：
   - 检查是否有未使用的工具函数

---

## 5. API 调用标准范例

### 5.1 基础 GET 请求

```javascript
// web/assets/js/api.js

import { API_BASE } from './config.js';

/**
 * 获取所有课程
 */
export async function fetchAllCourses(year, semester) {
    try {
        const url = `${API_BASE}/courses/all?year=${year}&semester=${semester}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Failed to fetch courses:', error);
        throw error;
    }
}

// 使用示例
async function loadCourses() {
    try {
        const data = await fetchAllCourses(114, 2);
        console.log(`获取到 ${data.total} 门课程`);
        return data.courses;
    } catch (error) {
        showError('获取课程列表失败：' + error.message);
        return [];
    }
}
```

### 5.2 POST 请求（带请求体）

```javascript
/**
 * 获取课程推荐
 */
export async function fetchRecommendations(payload) {
    try {
        const response = await fetch(`${API_BASE}/courses/recommend`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || `HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Failed to fetch recommendations:', error);
        throw error;
    }
}

// 使用示例
async function getRecommendations() {
    const payload = {
        empty_slots: getEmptySlots(),
        target_credits: 20,
        category: '核心通識',
        current_courses: state.selectedCourses.map(c => ({
            code: c.課程代碼,
            serial: c.序號
        }))
    };
    
    try {
        const data = await fetchRecommendations(payload);
        displayRecommendations(data.courses);
    } catch (error) {
        showError('获取推荐失败：' + error.message);
    }
}
```

### 5.3 带查询参数的请求

```javascript
/**
 * 搜索课程
 */
export async function searchCourses(query, limit = 50) {
    try {
        const url = new URL(`${API_BASE}/courses/search`);
        url.searchParams.append('q', query);
        url.searchParams.append('limit', limit.toString());
        
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        return await response.json();
    } catch (error) {
        console.error('Search failed:', error);
        throw error;
    }
}

// 使用示例
async function handleSearch() {
    const query = document.getElementById('search-input').value;
    if (!query.trim()) {
        showError('请输入搜索关键词');
        return;
    }
    
    try {
        showLoading('search-results', '搜索中...');
        const data = await searchCourses(query);
        displaySearchResults(data.courses);
    } catch (error) {
        showError('搜索失败：' + error.message);
    } finally {
        hideLoading('search-results');
    }
}
```

### 5.4 错误处理和重试

```javascript
/**
 * 带重试的 API 请求
 */
async function apiRequestWithRetry(url, options = {}, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.ok) {
                return await response.json();
            }
            
            // 如果是客户端错误（4xx），不重试
            if (response.status >= 400 && response.status < 500) {
                throw new Error(`Client error: ${response.status}`);
            }
            
            // 服务器错误（5xx），重试
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
                continue;
            }
            
            throw new Error(`Server error: ${response.status}`);
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
}
```

### 5.5 完整的 API 模块示例

```javascript
// web/assets/js/api.js

/**
 * Course Master API 客户端
 */
import { API_BASE } from './config.js';

class ApiClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }
    
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };
        
        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({
                    detail: `HTTP ${response.status}: ${response.statusText}`
                }));
                throw new Error(error.detail || 'Request failed');
            }
            
            return await response.json();
        } catch (error) {
            console.error(`API request failed: ${endpoint}`, error);
            throw error;
        }
    }
    
    // 课程相关 API
    async getAllCourses(year, semester) {
        return this.request(`/courses/all?year=${year}&semester=${semester}`);
    }
    
    async searchCourses(query, limit = 50) {
        return this.request(`/courses/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    }
    
    async getRecommendations(payload) {
        return this.request('/courses/recommend', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }
    
    async getCourseHistory(query, limit = 100) {
        return this.request(`/courses/history?q=${encodeURIComponent(query)}&limit=${limit}`);
    }
    
    async getCourseStats() {
        return this.request('/courses/stats');
    }
    
    async getDepartments(year, semester) {
        return this.request(`/departments?year=${year}&semester=${semester}`);
    }
}

// 导出单例
export const apiClient = new ApiClient(API_BASE);

// 兼容性：导出函数形式
export async function fetchAllCourses(year, semester) {
    return apiClient.getAllCourses(year, semester);
}

export async function fetchRecommendations(payload) {
    return apiClient.getRecommendations(payload);
}

// ... 其他函数
```

---

## 6. 部署配置

### 6.1 前端部署（GitHub Pages）

#### 步骤 1：准备前端文件

确保 `web/` 目录包含所有前端文件：
- `index.html`
- `assets/` 目录

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

#### 步骤 3：部署到 GitHub Pages

1. 将 `web/` 目录内容推送到 GitHub 仓库
2. 在仓库设置中启用 GitHub Pages
3. 选择源目录为 `web/` 或根目录（如果 `web/` 是根目录）

#### 步骤 4：验证部署

访问 GitHub Pages URL，检查：
- ✅ 页面正常加载
- ✅ API 调用正常（检查浏览器控制台）
- ✅ 无 CORS 错误

### 6.2 后端部署（独立服务器）

#### 步骤 1：准备服务器环境

```bash
# 安装 Python 3.8+
# 安装依赖
pip install -r requirements.txt
```

#### 步骤 2：配置环境变量

创建 `.env` 文件（生产环境）：

```bash
API_HOST=0.0.0.0
API_PORT=8000
API_KEY=your-secret-api-key  # 如果使用管理端点
LOG_LEVEL=INFO
```

#### 步骤 3：启动 API 服务

**开发环境**：
```bash
python main.py api
```

**生产环境**（使用 Gunicorn）：
```bash
pip install gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker src.api.app:app --bind 0.0.0.0:8000
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
    }
}
```

#### 步骤 5：配置 CORS

编辑 `src/api/app.py`：

```python
# 生产环境：限制允许的源
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-username.github.io",  # GitHub Pages 域名
        "https://your-custom-domain.com"    # 自定义域名（如果有）
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

#### 使用 GitHub Actions（如果代码在 GitHub）

创建 `.github/workflows/update-data.yml`：

```yaml
name: Update Course Data
on:
  schedule:
    - cron: '0 2 * * *'  # 每天 UTC 2 点
  workflow_dispatch:  # 允许手动触发

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.8'
      - name: Install dependencies
        run: pip install -r requirements.txt
      - name: Run crawler
        run: python main.py crawl
      - name: Process data
        run: python main.py process
      # 可选：将数据推回仓库或上传到服务器
```

---

## 7. 验证清单

### 后端验证

- [ ] API 服务可以正常启动
- [ ] 所有 API 端点可以正常访问
- [ ] CORS 配置正确
- [ ] 无静态文件服务相关代码
- [ ] 健康检查端点正常

### 前端验证

- [ ] 页面可以正常加载
- [ ] API 调用正常
- [ ] 无 CORS 错误
- [ ] 错误处理完善
- [ ] 加载状态显示正常

### 部署验证

- [ ] 前端可以部署到 GitHub Pages
- [ ] 后端可以部署到独立服务器
- [ ] 前后端可以正常通信
- [ ] 生产环境配置正确

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

- **后端 API**：`src/api/app.py`
- **前端配置**：`web/index.html`（API_CONFIG）
- **API 调用**：`web/assets/js/api.js`
- **CLI 入口**：`main.py`（保持不变）

### 下一步

1. ✅ 确认后端无静态文件服务
2. ✅ 确认前端 API 配置正确
3. ✅ 测试本地开发环境
4. ✅ 部署后端到服务器
5. ✅ 部署前端到 GitHub Pages
6. ✅ 配置生产环境 API 地址

