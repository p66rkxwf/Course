# Course Master - 智慧選課輔助系統

一個完整的課程數據分析和智慧選課輔助系統，包含數據爬取、處理、API 服務和 Web 界面。

## ✨ 主要功能

- 🕷️ **智能爬蟲**：自動爬取學校課程數據
- 🧹 **數據處理**：智能解析課程名稱、教師姓名、上課時間
- 📊 **數據分析**：課程統計、趨勢分析、智慧推薦
- 🌐 **Web 界面**：使用 Bootstrap 5 的現代化響應式界面
- 🚀 **REST API**：提供完整的數據訪問接口
- 📅 **完整課表系統**：12 節次課表顯示，支持多節次課程
- 🎯 **一鍵導入**：選擇班級後一鍵導入必選修課程
- 🔍 **智慧推薦**：根據空堂、學分數、偏好類別推薦課程
- 📈 **歷年資料**：查詢課程和教師的歷史開課記錄
- 🔔 **缺額追蹤**：自動監控課程人數，有人退選立即通知

## 📁 優化後的專案結構

```
Final_Project/
├── main.py                     # 主入口點
├── requirements.txt            # 依賴包列表
├── .gitignore                  # Git 忽略文件配置
├── README.md                   # 項目說明文檔
├── src/                        # 源代碼目錄
│   ├── config/               # 配置 package（`config/__init__.py`）
│   ├── crawler/               # 爬蟲模塊
│   │   └── crawler.py         # 課程數據爬蟲
│   ├── processor/             # 數據處理模塊
│   │   ├── data_processor.py  # 數據處理器
│   │   └── teacher_dict_builder.py  # 教師字典構建器
│   ├── api/                   # API 模塊
│   │   └── app.py             # FastAPI 應用
│   └── utils/                 # 工具模塊
│       └── common.py          # 共用工具函數
├── raw_data/                  # 原始數據
├── processed_data/            # 處理後數據
├── dict/                      # 教師字典
├── logs/                      # 日誌文件目錄
└── web/                       # Web 前端
    ├── index.html
    └── assets/
        ├── css/
        └── js/
```

## 🚀 快速開始

### 1. 安裝依賴

```bash
pip install -r requirements.txt
```

### 2. 執行完整流程

```bash
python main.py all
```

### 3. 或分步執行

```bash
# 爬取課程數據
python main.py crawl

# 構建教師字典
python main.py build-dict

# 處理數據
python main.py process

# 啟動 Web 服務
python main.py api
```

## 📖 詳細說明

### 爬蟲模塊 (`src/crawler/`)

負責從學校網站爬取課程數據：

- 支持多學期批量爬取
- 自動處理 ASP.NET 表單
- 解析課程表格和教學大綱鏈接
- 錯誤重試和日誌記錄

### 數據處理模塊 (`src/processor/`)

智能處理和清洗課程數據：

- **課程名稱分割**：自動分離中英文課程名稱
- **教師姓名解析**：使用字典和算法智能分割
- **時間地點解析**：處理複雜的上課時間格式
- **數據驗證**：確保數據質量和完整性

### API 模塊 (`src/api/`)

提供 REST API 接口：

- 課程搜索和過濾
- 統計數據獲取
- 課程詳情查詢
- 支持 CORS 和靜態文件服務

### Web 界面 (`web/`)

使用 Bootstrap 5 構建的現代化響應式 Web 應用：

- **完整課表系統**：12 節次課表，支持多節次課程，視覺化顯示
- **一鍵導入功能**：選擇系所和班級後，一鍵導入該班級所有必選修課程
- **智慧推薦系統**：根據空堂時段、目標學分數、課程類別智能推薦
- **歷年資料查詢**：查詢課程和教師的歷史開課記錄，包括選課人數趨勢
- **缺額追蹤功能**：追蹤爆滿課程，自動監控人數變化，有人退選立即通知
- **本地存儲**：課表數據自動保存到瀏覽器本地存儲

## 🔧 配置說明

主要配置在 `config/`（請參考 `config/__init__.py`）：

- 爬蟲參數（學期範圍、URL 等）
- 文件路徑設置
- API 服務器配置
- 日誌配置（日誌文件保存在 `logs/` 目錄）

## 📊 數據流程

```
原始網站 → 爬蟲 → 原始CSV → 數據處理 → 清理數據 → API → Web界面
```

## 🛠️ 技術棧

- **後端**：Python 3.8+
- **Web 框架**：FastAPI
- **數據處理**：pandas
- **爬蟲**：requests + BeautifulSoup4
- **前端**：HTML5 + Bootstrap 5 + JavaScript
- **圖標**：Bootstrap Icons + Font Awesome

## 📈 架構優化亮點

1. **模塊化設計**：清晰的代碼組織和責任分離
2. **配置集中管理**：所有配置統一管理
3. **錯誤處理和日誌**：完善的錯誤處理和日誌系統
4. **類型提示**：使用 Type Hints 提高代碼可維護性
5. **API 驅動**：前后端分離，支持多種客戶端
6. **可擴展性**：易於添加新功能和模塊

## 🤝 貢獻指南

1. Fork 本項目
2. 創建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

## 📄 許可證

本項目采用 MIT 許可證 - 查看 [LICENSE](LICENSE) 文件了解詳情。

## ⚠️ 注意事項

- 請遵守網站爬蟲規範，不要過度請求
- 定期備份重要數據
- 教師字典需要人工審核高風險項目
