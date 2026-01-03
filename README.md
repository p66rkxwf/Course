# Course Master — 智慧選課輔助系統 ✅

簡短說明：本專案爬取學校課程資料、清理與整合欄位，並透過 API 提供課程查詢與推薦功能。

## 🏗️ 架构说明

本项目采用**前后端分离架构**：

- **后端**：Python FastAPI 服务，提供 RESTful API 和数据处理功能
- **前端**：静态网站，通过 HTTP 与后端 API 通信

### 架构优势

- ✅ **职责分离**：前后端独立开发和部署
- ✅ **部署灵活**：前端可部署到 GitHub Pages、Netlify 等静态托管服务
- ✅ **易于扩展**：后端 API 可被多个前端应用复用
- ✅ **性能优化**：前端静态资源可通过 CDN 加速

详细架构设计请参考：[架构设计文档](./docs/ARCHITECTURE.md)

如需迁移指南，请参考：[迁移指南](./docs/MIGRATION.md)

---

## 🔧 快速檢查清單（我將執行的子任務）

1. 掃描、整理並註解主要程式檔案（module docstrings）
2. 合併重複的 I/O helper 並移到 `src/utils/io.py`
3. 加入簡短說明於腳本與舊版代碼（例如 `app_old.py` 標為過時）
4. 執行靜態語法檢查與非侵入性腳本測試（不執行爬蟲）
5. 更新 `README.md`（本檔）以反映目前結構與維護資訊

---

## 📁 專案目錄（精簡說明）

- `main.py` — 主入口，提供 `crawl|process|build-dict|api|all` 指令執行流程。
- `config/` — 項目級的配置 package（含路徑、爬蟲、API 與 logging 設定）。
- `data/` — 資料目錄
  - `raw/`：爬蟲輸出的原始 CSV
  - `processed/`：處理後的合併檔（`all_courses_*.csv`）
  - `dict/`：教師字典與科系映射等
- `src/` — 程式原始碼
  - `src/crawler/crawler.py` — 課程爬蟲（含網路 I/O；執行前請確認授權）
  - `src/processor/` — 資料處理模組（`data_processor.py`, `teacher_dict_builder.py`, `department_mapper.py`）
  - `src/api/app.py` — FastAPI 服務（主動用此檔啟動 API）
  - `src/api/app_old.py` — 過去版本，**保留作為參考**（可移除）
  - `src/utils/` — 工具函式（`common.py`, `io.py`）
- `scripts/` — 維護工具（例如 `print_config.py`, `check_processed_fields.py`, `manual_recommend_test.py`）
- `web/` — 前端靜態網站（`index.html`, `assets/`）
  - 獨立部署，通過 HTTP 與後端 API 通信
  - 詳細部署說明請參考 [前端部署說明](./frontend/README.md)

---

## ⚠️ 安全與運行建議

- 爬蟲 (`crawl`) 會發出網路請求，執行前請確認網路可用且已獲授權。若不確定，請勿運行 `python main.py crawl`。
- 建議先使用 `scripts/check_processed_fields.py` 檢查 `data/processed` 是否有合格檔案再啟動 API。
- 若只想啟動 API（不爬蟲、不處理），請確保 `data/processed` 已有至少一份 `all_courses_*.csv`。

---

## 🧪 測試與維護腳本（非自動化測試）

- `scripts/print_config.py` — 檢查正在載入的 `config`（確認是 top-level `config` package 而非 `src/config.py`）。
- `scripts/check_processed_fields.py` — 驗證 `data/processed/all_courses_*.csv` 是否包含必要欄位並回傳樣本錯誤值。
- `scripts/manual_recommend_test.py` — 對本地執行中的 API 發出推薦請求（需要 API 運行）。

---

## 🔁 我已執行的整理動作（摘要） ✅

- 將 CSV I/O helper 統一到 `src/utils/io.py`（並從 `src/utils/common.py` 匯入以避免重複）。
- 為主要模組加入清楚的 module docstrings（`api`, `crawler`, `processor`, `utils`, `scripts`）。
- 標註 `src/api/app_old.py` 為舊版，並保留以供參考。
- 執行語法檢查（所有 `.py` 檔案皆可編譯）與非侵入性腳本測試（`print_config.py`, `check_processed_fields.py`），結果正常。

---

## 🚀 快速啟動

### 后端 API 服务

1. 安裝依賴： `pip install -r requirements.txt`
2. 檢查現有處理檔案： `python scripts/check_processed_fields.py`
3. 啟動 API： `python main.py api`（需 `data/processed` 中有檔案）

API 将在 `http://localhost:8000` 启动，API 文档可在 `http://localhost:8000/docs` 查看。

### 前端开发

1. 进入前端目录： `cd web`
2. 启动开发服务器： `python -m http.server 8080`
3. 在浏览器中访问： `http://localhost:8080`

**注意**：前端默认配置为连接 `http://localhost:8000/api`，如需修改请编辑 `web/index.html` 中的 `API_CONFIG`。

### 完整开发环境

**终端 1 - 启动后端**：
```bash
python main.py api
```

**终端 2 - 启动前端**：
```bash
cd web
python -m http.server 8080
```

然后在浏览器中访问 `http://localhost:8080`。

### 生产环境部署

- **后端部署**：参考 [架构设计文档](./docs/ARCHITECTURE.md) 中的部署方案
- **前端部署**：参考 [前端部署说明](./frontend/README.md)

---

## 📦 貢獻與維護小註記

- 若要永久移除舊檔（如 `app_old.py`），請先在 PR 中標註理由與備援方法。
- 建議新增正式單元測試（`pytest`）以覆蓋 `processor` 與 `api` 的主要邏輯，避免迴歸。

---

如需我繼續：我可以（1）把 `app_old.py` 移到 `archive/`、或（2）新增自動化測試骨架、或（3）執行教師字典 / 處理流程的乾跑並回報結果。請告訴我你要我做哪個步驟。

## 📁 項目結構

```
CourseMaster/
├── config/                 # 配置文件目錄（目前為空）
├── data/                   # 數據文件目錄
│   ├── raw/               # 原始爬取數據
│   ├── processed/         # 處理後的數據
│   └── dict/              # 字典文件（教師、科系映射等）
├── docs/                  # 文檔目錄
│   ├── README.md         # 項目說明
│   └── FEATURES.md       # 功能說明
├── scripts/               # 腳本工具
│   ├── test_architecture.py     # 架構測試腳本
│   ├── test_department_mapping.py   # 科系映射測試
│   └── test_department_integration.py # 整合測試
├── src/                   # 源代碼
│   ├── config.py         # 全局配置
│   ├── crawler/          # 爬蟲模塊
│   │   └── course_crawler.py
│   ├── processor/        # 數據處理模塊
│   │   ├── data_processor.py
│   │   ├── teacher_dict_builder.py
│   │   └── department_mapper.py
│   ├── api/              # API 模塊
│   │   └── app.py
│   └── utils/            # 工具模塊
│       └── common.py
├── web/                   # Web 前端
│   ├── index.html
│   ├── assets/
│   │   ├── css/
│   │   │   └── style.css
│   │   └── js/
│   │       └── main.js
├── main.py               # 主入口點
├── requirements.txt      # 依賴包列表
├── .gitignore           # Git 忽略文件
└── logs/                # 日誌目錄
```

## 🚀 快速開始

### 1. 安裝依賴

```bash
pip install -r requirements.txt
```

### 2. 運行完整流程

```bash
# 爬取數據
python main.py crawl

# 構建教師字典
python main.py build-dict

# 處理數據
python main.py process

# 啟動 Web 服務
python main.py api

# 或執行完整流程
python main.py all
```

### 3. 架構測試

```bash
# 架構完整性測試
python scripts/test_architecture.py

# 科系映射測試
python scripts/test_department_mapping.py

# 部門信息整合測試
python scripts/test_department_integration.py
```

## 📊 數據處理流程

1. **數據爬取** (`crawler.py`)

   - 從學校網站爬取課程數據
   - 輸出到 `data/raw/`

2. **教師字典構建** (`teacher_dict_builder.py`)

   - 自動分析教師姓名模式
   - 建立教師姓名字典
   - 輸出到 `data/dict/`

3. **科系映射** (`department_mapper.py`)

   - 基於學校官網的學院結構
   - 自動解析開課班別代碼
   - 提取學院、科系、年級、班級信息

4. **數據處理** (`data_processor.py`)

   - 課程名稱分割（中英文）
   - 上課時間解析
   - 教師姓名處理
   - **新增：部門信息整合**
   - 輸出到 `data/processed/`

5. **Web API** (`api/app.py`)
   - 提供課程搜索接口
   - 課程統計數據
   - 支持前端展示

## 🏫 學校結構支持

系統支持國立彰化師範大學的完整學院結構：

- **教育學院**：輔導與諮商學系、特殊教育學系等
- **理學院**：數學系、物理學系、化學系、生物學系等
- **科技學院**：電機與機械科技學系、智慧車輛工程學系等
- **文學院**：國文學系、英語學系、美術學系、地理學系等
- **工學院**：機電工程學系、電機工程學系、電子工程學系、資訊工程學系等
- **管理學院**：資訊管理學系、會計學系、企業管理學系、財務金融技術學系等
- **社會科學暨體育學院**：運動學系、公共事務與公民教育學系等

## 🔧 主要功能

### 部門信息處理

- **智能科系解析**：自動從開課班別代碼提取學院、科系、年級、班級
- **支持 7 大學院**：教育學院、理學院、科技學院、文學院、工學院、管理學院、社會科學暨體育學院
- **年級班級識別**：自動解析年級（1-4 年級）和班級（A、B、C 等）信息

### API 功能

- 課程搜索（按名稱、教師、科系等）
- 課程統計數據
- 部門信息查詢

### Web 界面

- 響應式設計
- 課程時間表展示
- **部門篩選功能**：按學院和年級篩選課程推薦
- 智慧推薦系統
- 缺額追蹤功能
- **課程詳情展示**：包含完整的部門信息（學院、科系、年級、班級）
- 歷史記錄表格顯示部門信息
- 使用 SweetAlert2 (`Swal.fire`) 顯示提示與確認對話框

## 📋 數據欄位說明

處理後的數據包含以下欄位：

| 欄位名稱     | 說明             |
| ------------ | ---------------- |
| 學年度       | 課程學年度       |
| 學期         | 課程學期         |
| **學院**     | **所屬學院名稱** |
| **科系**     | **所屬科系名稱** |
| **年級**     | **適用年級**     |
| **班級**     | **適用班級**     |
| 課程名稱     | 課程中文名稱     |
| 英文課程名稱 | 課程英文名稱     |
| 教師姓名     | 原始教師姓名     |
| 教師列表     | 分割後的教師列表 |
| 上課地點     | 課程上課地點     |
| 星期         | 上課星期         |
| 起始節次     | 上課開始節次     |
| 結束節次     | 上課結束節次     |

## 🛠️ 技術棧

- **後端**：Python 3.8+
- **數據處理**：pandas, numpy
- **Web 框架**：FastAPI, Uvicorn
- **爬蟲**：requests, BeautifulSoup4
- **前端**：HTML, Bootstrap 5, JavaScript

## 📝 配置說明

主要配置位於 `config/`（可見於 `config/__init__.py`）：

- 爬取範圍設定（年份、學期）
- 文件路徑配置
- 日誌設定
- API 設定

## 🤝 貢獻指南

1. Fork 此項目
2. 創建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

## 📄 許可證

本項目採用 MIT 許可證 - 查看 [LICENSE](LICENSE) 文件了解詳情。

## 🙏 致謝

感謝國立彰化師範大學提供課程數據，感謝所有為此項目做出貢獻的開發者。
