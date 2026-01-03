"""工具：列印解析後的設定屬性。

此腳本用來確認是否載入專案頂層的 `config` package（而非 `src/config.py`），會列印主要屬性供檢查。
"""

import sys
from pathlib import Path
BASE_DIR = Path(__file__).parent.parent
# 先加入 project root，確保 top-level `config` package 優先被載入
sys.path.insert(0, str(BASE_DIR))
# 保留 src 以支援舊有模組路徑
sys.path.insert(1, str(BASE_DIR / 'src'))
import config
print('config file:', getattr(config, '__file__', None))
print('has PROCESSED_DATA_DIR:', hasattr(config, 'PROCESSED_DATA_DIR'))
print('attrs sample:', [a for a in dir(config) if not a.startswith('_')][:60])
