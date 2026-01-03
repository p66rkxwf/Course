# API 端点设计指南

## 📋 当前 API 端点（数据查询）

### 已实现的端点

| 端点 | 方法 | 功能 | 前端调用 |
|------|------|------|----------|
| `/api/courses/all` | GET | 获取所有课程 | ✅ 是 |
| `/api/courses/search` | GET | 搜索课程 | ✅ 是 |
| `/api/courses/recommend` | POST | 推荐课程 | ✅ 是 |
| `/api/courses/history` | GET | 获取历史数据 | ✅ 是 |
| `/api/courses/stats` | GET | 获取统计数据 | ✅ 是 |
| `/api/departments` | GET | 获取科系列表 | ✅ 是 |

**这些端点都是前端应该调用的**，用于获取和展示数据。

---

## 🔧 可选：管理端点（触发后端操作）

如果您需要在 Web 界面中触发 `crawl`、`process` 等操作，可以添加以下端点：

### 1. 触发爬虫端点

```python
# 在 src/api/app.py 中添加

from fastapi import BackgroundTasks
from pydantic import BaseModel

class TaskResponse(BaseModel):
    status: str
    message: str
    task_id: Optional[str] = None

# 任务状态存储（生产环境应使用 Redis 或数据库）
_task_status = {}

@app.post("/api/admin/crawl", response_model=TaskResponse)
async def trigger_crawl(background_tasks: BackgroundTasks):
    """
    触发课程数据爬取
    
    注意：此端点应该添加认证保护
    """
    try:
        # 使用后台任务执行，避免阻塞
        def run_crawl():
            from crawler.crawler import main as crawl_main
            crawl_main()
        
        background_tasks.add_task(run_crawl)
        
        return TaskResponse(
            status="started",
            message="爬虫任务已启动，正在后台执行"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"启动爬虫失败: {str(e)}")

@app.get("/api/admin/crawl/status")
async def get_crawl_status():
    """获取爬虫任务状态"""
    # 实现任务状态查询逻辑
    return {"status": "running", "progress": 50}
```

### 2. 触发数据处理端点

```python
@app.post("/api/admin/process", response_model=TaskResponse)
async def trigger_process(background_tasks: BackgroundTasks):
    """
    触发数据处理
    
    注意：此端点应该添加认证保护
    """
    try:
        def run_process():
            from processor.data_processor import main as process_main
            process_main()
        
        background_tasks.add_task(run_process)
        
        return TaskResponse(
            status="started",
            message="数据处理任务已启动，正在后台执行"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"启动处理失败: {str(e)}")
```

### 3. 前端调用示例

```javascript
// web/assets/js/api.js

export async function triggerCrawl() {
    const response = await fetch(`${API_BASE}/admin/crawl`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // 添加认证头（如果实现了认证）
            // 'Authorization': 'Bearer YOUR_API_KEY'
        }
    });
    if (!response.ok) throw new Error('Failed to trigger crawl');
    return await response.json();
}

export async function triggerProcess() {
    const response = await fetch(`${API_BASE}/admin/process`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    if (!response.ok) throw new Error('Failed to trigger process');
    return await response.json();
}
```

---

## ⚠️ 重要注意事项

### 1. 安全性

**这些管理端点必须添加认证**，否则任何人都可以触发爬虫和数据处理：

```python
from fastapi import Depends, HTTPException, Header

API_KEY = "your-secret-api-key"  # 应该从环境变量读取

async def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API Key")
    return x_api_key

@app.post("/api/admin/crawl")
async def trigger_crawl(
    background_tasks: BackgroundTasks,
    api_key: str = Depends(verify_api_key)
):
    # ... 实现
```

### 2. 异步处理

长时间运行的任务应该使用后台任务或任务队列：

```python
# 使用 Celery（推荐用于生产环境）
from celery import Celery

celery_app = Celery('tasks', broker='redis://localhost:6379')

@celery_app.task
def run_crawl():
    from crawler.crawler import main as crawl_main
    crawl_main()

@app.post("/api/admin/crawl")
async def trigger_crawl():
    task = run_crawl.delay()
    return {"task_id": task.id, "status": "started"}
```

### 3. 状态反馈

提供任务状态查询端点，让前端可以轮询任务状态：

```python
@app.get("/api/admin/tasks/{task_id}")
async def get_task_status(task_id: str):
    # 从 Redis 或数据库查询任务状态
    status = get_task_status_from_storage(task_id)
    return status
```

---

## 🎯 推荐方案

### 方案 A：不需要 Web 界面触发（推荐）

**适用场景**：
- 数据更新频率固定（如每学期一次）
- 使用定时任务（Cron）自动执行

**实施方式**：
- 不需要添加管理端点
- 使用 Cron 定时执行 `python main.py crawl` 和 `python main.py process`
- 前端只调用数据查询端点

### 方案 B：需要 Web 界面触发

**适用场景**：
- 需要手动触发数据更新
- 需要实时查看任务状态

**实施方式**：
- 添加管理端点（如上所示）
- 添加认证保护
- 使用后台任务或任务队列
- 前端添加管理界面

---

## 📝 总结

### 前端应该调用的端点

✅ **数据查询端点**（已实现）：
- `/api/courses/*` - 所有课程相关查询
- `/api/departments` - 科系查询

### 前端不应该直接执行的操作

❌ **服务器端操作**（需要通过 API 触发）：
- 爬虫执行（`crawl`）
- 数据处理（`process`）
- 字典构建（`build-dict`）

### 实施建议

1. **如果不需要 Web 界面触发**：
   - 保持当前架构
   - 使用定时任务执行 `crawl` 和 `process`
   - 前端只调用数据查询端点

2. **如果需要 Web 界面触发**：
   - 添加管理端点（如上所示）
   - 添加认证保护
   - 使用后台任务处理
   - 提供任务状态查询

