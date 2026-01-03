"""推薦端點的快速人工測試工具。

需本地啟動 API 伺服器（參考 `config/api.py` 的設定），可用於快速健全性檢查。
"""

import requests

url = "http://127.0.0.1:8001/api/courses/recommend"
payload = {
    "empty_slots": None,
    "target_credits": 99,
    "category": "通識",
    "college": None,
    "grade": None,
    "current_courses": []
}
resp = requests.post(url, json=payload, timeout=10)
print('status', resp.status_code)
print('courses_count', len(resp.json().get('courses', [])))
print('ok sample', resp.json().get('courses', [])[:2])
