# 前后端分离架构迁移指南

## 📋 迁移概述

本指南将帮助您将项目从单体架构迁移到前后端分离架构。

## 🔄 主要变更

### 1. 后端变更

#### 移除的功能
- ✅ 静态文件服务（`StaticFiles`）
- ✅ 根路径返回 HTML 文件（`/` 路由）
- ✅ `WEB_DIR` 配置依赖

#### 新增的功能
- ✅ API 健康检查端点 (`/api/health`)
- ✅ API 根路径信息端点 (`/`)
- ✅ 改进的 CORS 配置说明

#### 保持不变
- ✅ 所有 API 端点保持不变
- ✅ CLI 功能（`crawl`, `process`, `build-dict`）保持不变
- ✅ 数据处理逻辑保持不变

### 2. 前端变更

#### 新增的功能
- ✅ 可配置的 API 服务器地址
- ✅ 通过 `window.API_CONFIG` 配置 API 地址
- ✅ 支持开发和生产环境的不同配置

#### 保持不变
- ✅ 所有前端功能保持不变
- ✅ UI 和交互逻辑保持不变

## 📝 迁移步骤

### 步骤 1：更新后端代码

后端代码已经更新，主要变更在 `src/api/app.py`：

1. 移除了静态文件服务
2. 移除了根路径的 HTML 文件返回
3. 添加了 API 信息端点

**无需额外操作**，代码已经更新完成。

### 步骤 2：更新前端配置

#### 开发环境

1. 打开 `web/index.html`
2. 找到以下代码：

```html
<script>
    window.API_CONFIG = {
        API_BASE: 'http://localhost:8000/api'
    };
</script>
```

3. 确认 API 地址为 `http://localhost:8000/api`（默认值，通常无需修改）

#### 生产环境

1. 打开 `web/index.html`
2. 修改 `API_BASE` 为实际的 API 服务器地址：

```html
<script>
    window.API_CONFIG = {
        API_BASE: 'https://api.example.com/api'
    };
</script>
```

### 步骤 3：测试本地开发环境

1. **启动后端 API**：

```bash
python main.py api
```

后端将在 `http://localhost:8000` 启动。

2. **启动前端开发服务器**：

```bash
cd web
python -m http.server 8080
```

前端将在 `http://localhost:8080` 启动。

3. **测试功能**：
   - 打开浏览器访问 `http://localhost:8080`
   - 测试课程搜索、推荐等功能
   - 检查浏览器控制台是否有错误

### 步骤 4：部署到生产环境

#### 后端部署

1. 将后端代码部署到服务器
2. 启动 API 服务：

```bash
python main.py api
```

或使用生产级 WSGI 服务器：

```bash
gunicorn -w 4 -k uvicorn.workers.UvicornWorker src.api.app:app --bind 0.0.0.0:8000
```

3. 配置 Nginx 反向代理（可选）：

```nginx
server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### 前端部署

选择以下任一方式：

1. **GitHub Pages**：将 `web/` 目录内容推送到 GitHub 并启用 Pages
2. **Netlify**：导入项目，设置构建目录为 `web`
3. **Vercel**：导入项目，配置静态文件服务
4. **传统 Web 服务器**：将 `web/` 目录内容复制到 Web 服务器根目录

**重要**：部署前端后，记得修改 `index.html` 中的 API 地址为生产环境的地址。

## 🔍 验证清单

迁移完成后，请验证以下项目：

- [ ] 后端 API 可以正常启动
- [ ] 前端可以正常访问后端 API
- [ ] 课程搜索功能正常
- [ ] 课程推荐功能正常
- [ ] 历史课程查询功能正常
- [ ] 课程导入功能正常
- [ ] 浏览器控制台没有 CORS 错误
- [ ] 生产环境 API 地址配置正确

## ⚠️ 常见问题

### 1. CORS 错误

**问题**：浏览器控制台出现 CORS 错误

**解决方案**：
- 检查后端 `src/api/app.py` 中的 CORS 配置
- 确保 `allow_origins` 包含前端域名（生产环境）
- 开发环境可以使用 `allow_origins=["*"]`

### 2. API 请求失败

**问题**：前端无法连接到后端 API

**解决方案**：
- 检查后端 API 是否正在运行
- 检查 `index.html` 中的 `API_BASE` 配置是否正确
- 检查网络连接和防火墙设置

### 3. 404 错误

**问题**：访问 API 端点返回 404

**解决方案**：
- 确认 API 端点路径正确（应该是 `/api/...`）
- 检查后端路由配置
- 查看后端日志确认请求是否到达

### 4. 静态资源加载失败

**问题**：CSS 或 JS 文件无法加载

**解决方案**：
- 检查文件路径是否正确（相对路径）
- 确认所有文件都在 `web/assets/` 目录下
- 检查 Web 服务器配置

## 📚 相关文档

- [架构设计文档](./ARCHITECTURE.md)
- [前端部署说明](../frontend/README.md)
- [主 README](../README.md)

## 🆘 需要帮助？

如果遇到问题，请：

1. 查看相关文档
2. 检查浏览器控制台和服务器日志
3. 确认配置是否正确
4. 提交 Issue 或联系维护者

