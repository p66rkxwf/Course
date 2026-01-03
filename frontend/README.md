# 前端部署说明

## 📁 目录结构

```
frontend/
├── index.html          # 主页面
├── assets/
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── config.js   # API 配置
│       ├── api.js      # API 调用封装
│       └── ...
└── README.md          # 本文件
```

## ⚙️ 配置 API 服务器地址

### 方法 1：修改 HTML 文件（推荐）

在 `index.html` 中找到以下代码：

```html
<script>
    window.API_CONFIG = {
        API_BASE: 'http://localhost:8000/api'
    };
</script>
```

将 `API_BASE` 修改为实际的 API 服务器地址，例如：

```html
<script>
    window.API_CONFIG = {
        API_BASE: 'https://api.example.com/api'
    };
</script>
```

### 方法 2：修改 config.js 文件

在 `assets/js/config.js` 中直接修改 `DEFAULT_API_BASE` 的值。

## 🚀 部署方式

### 方式 1：使用 Python 简单服务器（开发/测试）

```bash
cd frontend
python -m http.server 8080
```

然后在浏览器中访问 `http://localhost:8080`

### 方式 2：使用 Nginx

将 `frontend/` 目录的内容复制到 Nginx 的网站根目录，例如：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/frontend;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 方式 3：部署到 GitHub Pages

1. 将 `frontend/` 目录的内容推送到 GitHub 仓库
2. 在仓库设置中启用 GitHub Pages
3. 选择 `frontend/` 目录作为源目录
4. 访问 `https://your-username.github.io/repo-name/`

**注意**：部署到 GitHub Pages 时，需要修改 API 地址为实际的 API 服务器地址（不能使用 `localhost`）。

### 方式 4：部署到 Netlify

1. 将项目推送到 Git 仓库
2. 在 Netlify 中导入项目
3. 设置构建目录为 `frontend`
4. 发布目录也为 `frontend`
5. 部署后，修改 `index.html` 中的 API 地址为生产环境的 API 地址

### 方式 5：部署到 Vercel

1. 在项目根目录创建 `vercel.json`：

```json
{
  "version": 2,
  "builds": [
    {
      "src": "frontend/**",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/frontend/$1"
    }
  ]
}
```

2. 将项目推送到 Git 仓库
3. 在 Vercel 中导入项目并部署

## 🔧 开发环境设置

1. 确保后端 API 服务器正在运行（默认 `http://localhost:8000`）
2. 启动前端开发服务器：

```bash
cd frontend
python -m http.server 8080
```

3. 在浏览器中访问 `http://localhost:8080`

## ⚠️ 注意事项

### CORS 问题

如果前端和后端部署在不同的域名，需要确保后端 API 配置了正确的 CORS 策略。

在 `backend/src/api/app.py` 中，生产环境应该限制 `allow_origins`：

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend-domain.com"],  # 只允许特定域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### API 地址配置

- **开发环境**：使用 `http://localhost:8000/api`
- **生产环境**：使用实际的 API 服务器地址，例如 `https://api.example.com/api`

### 相对路径 vs 绝对路径

- 如果前端和后端部署在同一域名下（例如通过 Nginx 反向代理），可以使用相对路径 `/api`
- 如果前端和后端部署在不同域名，必须使用完整的 URL（包含协议和域名）

## 📝 示例配置

### 开发环境

```html
<script>
    window.API_CONFIG = {
        API_BASE: 'http://localhost:8000/api'
    };
</script>
```

### 生产环境（同一域名）

```html
<script>
    window.API_CONFIG = {
        API_BASE: '/api'
    };
</script>
```

### 生产环境（不同域名）

```html
<script>
    window.API_CONFIG = {
        API_BASE: 'https://api.example.com/api'
    };
</script>
```

