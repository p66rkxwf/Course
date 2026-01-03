"""舊版 API 實作（保留參考）。

此檔包含舊版本的 API 處理程式。請以 `src/api/app.py` 作為主要實作；此檔暫保留供參考，審查後可移除。
"""

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import pandas as pd
import logging
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
