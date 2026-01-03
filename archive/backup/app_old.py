"""舊版 API 實作（保留參考）。

此檔包含舊版本的 API 處理程式。請以 `src/api/app.py` 作為主要實作；此檔暫保留供參考，審查後可移除。
"""

"""已存檔：備份檔案已移至 `archive/backup/app_old.py`。

原檔保留於此處以便回溯，但建議改以 `src/api/app.py` 作為主要實作。
"""

# 注意：此檔已被標記為存檔，請勿於生產環境中引用。
# 若要永久移除，請於確認後執行刪除動作。

from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from config import PROCESSED_DATA_DIR, WEB_DIR, API_HOST, API_PORT, LOG_LEVEL, LOG_FORMAT, LOG_FILE, LOG_DIR
from utils.common import safe_read_csv, setup_logging

def clean_course_data(courses: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """清理課程數據，處理 NaN 並規範型別。"""
    import math
    
    cleaned = []
    for course in courses:
        cleaned_course = {}
        for key, value in course.items():
            if isinstance(value, float) and math.isnan(value):
                cleaned_course[key] = None
            else:
                cleaned_course[key] = value
        # 對節次做型別規範：如果是數字並且為整數，轉為 int
        for fld in ['起始節次', '結束節次']:
            if fld in cleaned_course and cleaned_course[fld] is not None:
                try:
                    num = float(cleaned_course[fld])
                    if num.is_integer():
                        cleaned_course[fld] = int(num)
                except Exception:
                    # leave as-is if not numeric
                    pass
        cleaned.append(cleaned_course)
    return cleaned

def clean_single_course(course: Dict[str, Any]) -> Dict[str, Any]:
    """清理單筆課程資料。"""
    import math
    
    cleaned_course = {}
    for key, value in course.items():
        if isinstance(value, float) and math.isnan(value):
            cleaned_course[key] = None
        else:
            cleaned_course[key] = value
    return cleaned_course

app = FastAPI(title="Course Master API", version="1.0.0")

# 添加 CORS 支持
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 掛載靜態文件
app.mount("/css", StaticFiles(directory=str(WEB_DIR / "assets" / "css")), name="css")
app.mount("/js", StaticFiles(directory=str(WEB_DIR / "assets" / "js")), name="js")

# 全局變量：緩存課程數據
_courses_cache: Dict[str, pd.DataFrame] = {}

def get_latest_courses_df() -> Optional[pd.DataFrame]:
    """取得最新課程資料"""
    cache_key = "latest"
    if cache_key in _courses_cache:
        return _courses_cache[cache_key]
    
    processed_files = sorted(PROCESSED_DATA_DIR.glob("all_courses_*.csv"))
    if not processed_files:
        return None
    
    latest_file = processed_files[-1]
    df = safe_read_csv(latest_file)
    if df is not None:
        _courses_cache[cache_key] = df
    return df

def get_courses_by_semester(year: int, semester: int) -> Optional[pd.DataFrame]:
    """獲取指定學期的課程數據"""
    cache_key = f"{year}_{semester}"
    if cache_key in _courses_cache:
        return _courses_cache[cache_key]
    
    df = get_latest_courses_df()
    if df is None:
        return None
    
    # 篩選指定學期
    filtered = df[
        (df['學年度'].astype(str) == str(year)) & 
        (df['學期'].astype(str) == str(semester))
    ].copy()
    
    if not filtered.empty:
        _courses_cache[cache_key] = filtered
    return filtered

class CourseSearchRequest(BaseModel):
    query: str
    limit: Optional[int] = 50

class CourseResponse(BaseModel):
    courses: List[Dict[str, Any]]
    total: int

class RecommendRequest(BaseModel):
    empty_slots: Optional[List[Dict[str, int]]] = None
    target_credits: int = 20
    category: str = "通識"
    college: Optional[str] = None
    grade: Optional[str] = None
    current_courses: List[Dict[str, Any]] = []
    # optional semester specification — if provided, recommendation is limited to that semester
    year: Optional[int] = None
    semester: Optional[int] = None



@app.get("/")
async def read_root():
    """回傳主頁"""
    return FileResponse(WEB_DIR / "index.html")

@app.get("/api/courses/all")
async def get_all_courses(year: Optional[int] = None, semester: Optional[int] = None):
    """獲取所有課程（可選篩選學期）"""
    try:
        if year and semester:
            df = get_courses_by_semester(year, semester)
        else:
            df = get_latest_courses_df()
        
        if df is None or df.empty:
            return CourseResponse(courses=[], total=0)
        
        courses = df.to_dict('records')
        courses = clean_course_data(courses)
        return CourseResponse(courses=courses, total=len(courses))
    except Exception as e:
        logging.error(f"獲取課程列表失敗: {e}")
        raise HTTPException(status_code=500, detail="獲取課程列表失敗")

@app.get("/api/courses/search")
async def search_courses(q: str, limit: int = 50):
    """搜索課程"""
    try:
        df = get_latest_courses_df()
        if df is None or df.empty:
            raise HTTPException(status_code=404, detail="沒有處理過的課程數據")

        # 搜索邏輯
        query = q.lower()
        mask = (
            df['課程名稱'].astype(str).str.lower().str.contains(query, na=False) |
            df['教師姓名'].astype(str).str.lower().str.contains(query, na=False) |
            df['課程名稱'].astype(str).str.lower().str.contains(query, na=False) |
            df['英文課程名稱'].astype(str).str.lower().str.contains(query, na=False)
        )

        results = df[mask].head(limit)
        courses = results.to_dict('records')
        courses = clean_course_data(courses)

        return CourseResponse(courses=courses, total=len(courses))
    except Exception as e:
        logging.error(f"搜索課程失敗: {e}")
        raise HTTPException(status_code=500, detail="搜索失敗")

@app.get("/api/courses/by-class")
async def get_courses_by_class(
    department: str,
    class_name: str,
    year: int,
    semester: int
):
    """根據班級獲取必選修課程"""
    try:
        df = get_courses_by_semester(year, semester)
        if df is None or df.empty:
            return CourseResponse(courses=[], total=0)
        
        # 篩選該班級的課程（根據開課班別）
        mask = (
            (df['開課班別(代表)'].astype(str).str.contains(department, na=False)) |
            (df['開課班別(代表)'].astype(str).str.contains(class_name, na=False))
        )
        
        # 優先選擇必修課程
        required_mask = df['課程性質'].astype(str).str.contains('必修', na=False)
        required_courses = df[mask & required_mask]
        elective_courses = df[mask & ~required_mask]
        
        # 合併結果，必修在前
        result_df = pd.concat([required_courses, elective_courses], ignore_index=True)
        courses = result_df.to_dict('records')
        courses = clean_course_data(courses)
        
        return CourseResponse(courses=courses, total=len(courses))
    except Exception as e:
        logging.error(f"獲取班級課程失敗: {e}")
        raise HTTPException(status_code=500, detail="獲取班級課程失敗")

@app.post("/api/courses/recommend")
async def recommend_courses(request: RecommendRequest):
    """推薦課程"""
    try:
        df = get_latest_courses_df()
        if df is None or df.empty:
            raise HTTPException(status_code=404, detail="沒有處理過的課程數據")
        
        # 篩選學期：優先使用請求提供的 year/semester，否則使用資料中最新學期
        if request.year is not None and request.semester is not None:
            current_year = request.year
            current_semester = request.semester
        else:
            # 使用資料中的最新學期（高年級與最新學期）
            current_year = int(df['學年度'].max()) if '學年度' in df.columns else None
            if current_year is not None:
                # 在最新學年度下取最大學期
                try:
                    current_semester = int(df[df['學年度'] == current_year]['學期'].max())
                except Exception:
                    current_semester = 1
            else:
                current_semester = 1

        if current_year is not None and current_semester is not None:
            df = df[
                (df['學年度'].astype(str) == str(current_year)) & 
                (df['學期'].astype(str) == str(current_semester))
            ]
        
        if df.empty:
            return CourseResponse(courses=[], total=0)
        
        # 根據類別篩選
        if request.category == "通識":
            mask = df['課程性質'].astype(str).str.contains('通識', na=False)
        elif request.category == "國文":
            mask = df['課程性質'].astype(str).str.contains('國文', na=False)
        elif request.category == "英文":
            mask = df['課程性質'].astype(str).str.contains('英文', na=False)
        else:
            mask = pd.Series([True] * len(df))
        
        filtered_df = df[mask].copy()
        
        # 根據學院篩選
        if request.college:
            college_mask = filtered_df['學院'].astype(str).str.contains(request.college, na=False)
            filtered_df = filtered_df[college_mask]
        
        # 根據年級篩選
        if request.grade:
            grade_mask = filtered_df['年級'].astype(str) == str(request.grade)
            filtered_df = filtered_df[grade_mask]
        
        # 排除已選課程
        if request.current_courses:
            for course in request.current_courses:
                code = course.get('code', '')
                serial = course.get('serial', '')
                filtered_df = filtered_df[
                    ~((filtered_df['課程代碼'].astype(str) == str(code)) & 
                      (filtered_df['序號'].astype(str) == str(serial)))
                ]
        
        # 若有提供 empty_slots，過濾出完全落在空堂內的課程
        if request.empty_slots:
            empty_set = set((int(s['day']), int(s['period'])) for s in request.empty_slots if s and 'day' in s and 'period' in s)
            def fits_empty_slots(row):
                try:
                    day = row.get('星期') if '星期' in row else None
                    # Normalize day: if Chinese numerals, map
                    if pd.isna(day) or day is None:
                        return False
                    if isinstance(day, str) and day.isdigit():
                        day_num = int(day)
                    elif isinstance(day, (int, float)):
                        day_num = int(day)
                    else:
                        map_day = {'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'日':7}
                        day_num = map_day.get(str(day), None)
                    if not day_num:
                        return False
                    start = int(row.get('起始節次') or 0)
                    end = int(row.get('結束節次') or 0)
                    if start <= 0 or end <= 0:
                        return False
                    for p in range(start, end+1):
                        if (day_num, p) not in empty_set:
                            return False
                    return True
                except Exception:
                    return False
            filtered_df = filtered_df[filtered_df.apply(fits_empty_slots, axis=1)]

        # 計算熱門度（選課人數/上限人數）
        filtered_df['熱門度'] = filtered_df.apply(
            lambda row: (row['選上人數'] / row['上限人數'] * 100) if (row.get('上限人數') and row.get('上限人數') > 0) else 0,
            axis=1
        )
        
        # 根據熱門度排序
        filtered_df = filtered_df.sort_values('熱門度', ascending=False)
        
        # 限制學分數
        if request.target_credits > 0:
            total_credits = 0
            recommended = []
            for _, row in filtered_df.iterrows():
                credits = float(row.get('學分', 0) or 0)
                if total_credits + credits <= request.target_credits:
                    recommended.append(row)
                    total_credits += credits
                if total_credits >= request.target_credits:
                    break
            filtered_df = pd.DataFrame(recommended)
        
        # 限制返回數量
        filtered_df = filtered_df.head(50)
        
        courses = filtered_df.to_dict('records')
        courses = clean_course_data(courses)
        return CourseResponse(courses=courses, total=len(courses))
    except Exception as e:
        logging.error(f"推薦課程失敗: {e}")
        raise HTTPException(status_code=500, detail="推薦課程失敗")

@app.get("/api/courses/history")
async def get_course_history(q: str, limit: int = 100):
    """獲取課程歷年資料"""
    try:
        df = get_latest_courses_df()
        if df is None or df.empty:
            raise HTTPException(status_code=404, detail="沒有處理過的課程數據")

        # 搜索邏輯
        query = q.lower()
        mask = (
            df['課程名稱'].astype(str).str.lower().str.contains(query, na=False) |
            df['教師姓名'].astype(str).str.lower().str.contains(query, na=False) |
            df['課程名稱'].astype(str).str.lower().str.contains(query, na=False) |
            df['英文課程名稱'].astype(str).str.lower().str.contains(query, na=False)
        )

        results = df[mask].copy()
        
        # 按學年度和學期排序
        results = results.sort_values(['學年度', '學期'], ascending=[False, False])
        
        # 限制返回數量
        results = results.head(limit)
        
        courses = results.to_dict('records')
        courses = clean_course_data(courses)
        return CourseResponse(courses=courses, total=len(courses))
    except Exception as e:
        logging.error(f"獲取歷年資料失敗: {e}")
        raise HTTPException(status_code=500, detail="獲取歷年資料失敗")

@app.get("/api/courses/stats")
async def get_course_stats():
    """獲取課程統計信息"""
    try:
        df = get_latest_courses_df()
        if df is None or df.empty:
            raise HTTPException(status_code=404, detail="沒有處理過的課程數據")

        stats = {
            "total_courses": len(df),
            "total_teachers": df['教師姓名'].nunique() if '教師姓名' in df.columns else 0,
            "departments": df['開課班別(代表)'].value_counts().head(10).to_dict() if '開課班別(代表)' in df.columns else {},
            "course_types": df['課程性質'].value_counts().to_dict() if '課程性質' in df.columns else {},
            "english_only": int(df['全英語授課'].sum()) if '全英語授課' in df.columns else 0,
            "avg_enrollment": float(df['選上人數'].mean()) if '選上人數' in df.columns else 0,
            "max_enrollment": int(df['選上人數'].max()) if '選上人數' in df.columns else 0
        }

        return stats
    except Exception as e:
        logging.error(f"獲取統計信息失敗: {e}")
        raise HTTPException(status_code=500, detail="獲取統計失敗")

@app.get("/api/courses/{course_id}")
async def get_course_detail(course_id: str):
    """獲取課程詳情"""
    try:
        df = get_latest_courses_df()
        if df is None or df.empty:
            raise HTTPException(status_code=404, detail="沒有處理過的課程數據")

        # 假設 course_id 是課程代碼
        course = df[df['課程代碼'].astype(str) == str(course_id)]
        if course.empty:
            raise HTTPException(status_code=404, detail="找不到課程")

        return clean_single_course(course.iloc[0].to_dict())
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"獲取課程詳情失敗: {e}")
        raise HTTPException(status_code=500, detail="獲取詳情失敗")









@app.get("/api/departments")
async def get_departments(year: Optional[int] = None, semester: Optional[int] = None):
    """獲取所有系所列表"""
    try:
        if year and semester:
            df = get_courses_by_semester(year, semester)
        else:
            df = get_latest_courses_df()
        
        if df is None or df.empty or '開課班別(代表)' not in df.columns:
            return {"departments": []}
        
        departments = df['開課班別(代表)'].dropna().unique().tolist()
        departments = [d for d in departments if d and str(d).strip()]
        departments.sort()
        
        return {"departments": departments}
    except Exception as e:
        logging.error(f"獲取系所列表失敗: {e}")
        raise HTTPException(status_code=500, detail="獲取系所列表失敗")

def main():
    """啟動 API 服務器"""
    setup_logging()
    import uvicorn
    logging.info(f"啟動 Course Master API 服務器在 {API_HOST}:{API_PORT}")
    uvicorn.run(app, host=API_HOST, port=API_PORT)

if __name__ == "__main__":
    main()
