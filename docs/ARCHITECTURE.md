# 前后端分离架构设计文档

## 📐 目录结构

```
Course/
├── backend/                    # 后端服务（Python）
│   ├── src/
│   │   ├── api/               # API 模块
│   │   │   └── app.py         # FastAPI 应用（仅 API，不提供静态文件）
│   │   ├── crawler/           # 爬虫模块
│   │   ├── processor/         # 数据处理模块
│   │   └── utils/             # 工具模块
│   ├── config/                # 配置文件
│   ├── data/                  # 数据目录
│   │   ├── raw/              # 原始爬取数据
│   │   ├── processed/        # 处理后的数据
│   │   └── dict/             # 字典文件
│   ├── scripts/               # 维护脚本
│   ├── main.py                # CLI 入口
│   └── requirements.txt       # Python 依赖
│
├── frontend/                   # 前端静态网站
│   ├── index.html            # 主页面
│   ├── assets/
│   │   ├── css/
│   │   │   └── style.css
│   │   └── js/
│   │       ├── config.js     # 配置（包含 API 服务器地址）
│   │       ├── api.js        # API 调用封装
│   │       ├── main.js       # 主逻辑
│   │       └── ...
│   └── README.md             # 前端部署说明
│
├── docs/                      # 文档目录
│   ├── ARCHITECTURE.md       # 本文件
│   ├── README.md
│   └── FEATURES.md
│
└── README.md                  # 项目主文档
```

## 🏗️ 架构设计理由

### 1. 前后端分离的优势

#### 1.1 职责分离
- **后端**：专注于数据爬取、处理和 API 服务
  - 不涉及前端资源管理
  - 可以独立部署和扩展
  - 便于添加 API 版本控制
  
- **前端**：专注于用户界面和交互
  - 可以独立开发和部署
  - 可以使用任何静态网站托管服务（GitHub Pages, Netlify, Vercel 等）
  - 便于 CDN 加速

#### 1.2 部署灵活性
- **后端**：可以部署在任何支持 Python 的服务器
  - 本地开发：`localhost:8000`
  - 生产环境：`api.example.com`
  - 容器化：Docker 部署
  
- **前端**：可以部署在任何静态网站托管服务
  - GitHub Pages（免费）
  - Netlify / Vercel（免费，支持自动部署）
  - 传统 Web 服务器（Nginx, Apache）

#### 1.3 开发效率
- 前后端可以并行开发
- 前端可以使用 Mock API 进行开发
- 后端 API 可以被多个前端应用复用（Web、移动端等）

#### 1.4 性能优化
- 前端静态资源可以通过 CDN 加速
- 后端 API 可以独立进行性能优化
- 可以针对不同场景进行不同的缓存策略

### 2. 目录结构设计理由

#### 2.1 `backend/` 目录
- **集中管理后端代码**：所有 Python 代码、配置、数据都在此目录
- **便于容器化**：可以轻松创建 Docker 镜像
- **清晰的依赖管理**：`requirements.txt` 明确列出所有依赖

#### 2.2 `frontend/` 目录
- **独立的前端项目**：可以单独进行版本控制（如果需要）
- **便于部署**：整个目录可以直接部署到静态网站托管服务
- **清晰的资源组织**：HTML、CSS、JS 文件结构清晰

#### 2.3 配置分离
- **后端配置**：`backend/config/` - 爬虫、API、日志等配置
- **前端配置**：`frontend/assets/js/config.js` - API 服务器地址等前端配置

### 3. API 设计

#### 3.1 API 基础路径
- 开发环境：`http://localhost:8000/api`
- 生产环境：`https://api.example.com/api`
- 前端通过 `config.js` 中的 `API_BASE` 配置项指定

#### 3.2 CORS 配置
- 后端需要配置 CORS，允许前端域名访问
- 生产环境建议限制允许的源（origins）

#### 3.3 API 版本控制
- 当前版本：`/api/v1/`（可选，当前为 `/api/`）
- 未来可以添加版本控制，便于 API 演进

### 4. 部署方案

#### 4.1 开发环境
```bash
# 终端 1：启动后端 API
cd backend
python main.py api

# 终端 2：启动前端开发服务器（或直接打开 HTML）
cd frontend
# 使用 Python 简单服务器或任何静态文件服务器
python -m http.server 8080
```

#### 4.2 生产环境

**后端部署**：
- 使用 Gunicorn + Uvicorn 作为 WSGI 服务器
- 使用 Nginx 作为反向代理
- 或使用 Docker 容器化部署

**前端部署**：
- 部署到 GitHub Pages
- 部署到 Netlify / Vercel
- 或使用 Nginx 提供静态文件服务

### 5. 安全考虑

#### 5.1 CORS 策略
- 开发环境：允许所有源（`allow_origins=["*"]`）
- 生产环境：只允许特定前端域名

#### 5.2 API 认证（未来扩展）
- 可以添加 API Key 认证
- 可以添加 JWT 认证
- 可以添加 Rate Limiting

### 6. 开发工作流

#### 6.1 本地开发
1. 启动后端 API 服务器
2. 配置前端 `config.js` 指向本地 API
3. 使用浏览器打开前端页面或使用开发服务器

#### 6.2 测试
- 后端：使用 pytest 进行单元测试和集成测试
- 前端：可以手动测试或使用自动化测试工具

#### 6.3 部署流程
1. 后端：更新代码 → 测试 → 部署到服务器
2. 前端：更新代码 → 构建（如需要）→ 部署到静态托管服务
3. 更新前端配置中的 API 地址（如需要）

## 📝 迁移步骤

1. ✅ 创建新的目录结构
2. ✅ 重构后端，移除静态文件服务
3. ✅ 更新前端配置，支持可配置的 API 地址
4. ✅ 更新文档和部署说明
5. ⏳ 测试前后端通信
6. ⏳ 部署到生产环境

## 🔄 向后兼容性

- 原有的 CLI 功能（`main.py crawl|process|build-dict`）保持不变
- API 端点保持不变，只是不再提供静态文件服务
- 数据格式和处理逻辑保持不变

