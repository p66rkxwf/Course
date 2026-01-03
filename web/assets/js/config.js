/**
 * 全局配置與常數
 * 
 * API 服务器配置：
 * - 开发环境：通常为 'http://localhost:8000/api'
 * - 生产环境：设置为实际的 API 服务器地址，例如 'https://api.example.com/api'
 * 
 * 配置方式：
 * 1. 直接修改下面的 API_BASE 值
 * 2. 或通过环境变量（如果使用构建工具）
 * 3. 或在部署时通过配置文件覆盖
 */
// 默认配置：开发环境（本地 API 服务器）
// 生产环境部署时，请修改为实际的 API 服务器地址
const DEFAULT_API_BASE = 'http://localhost:8000/api';

// 尝试从 window 对象获取配置（允许在 HTML 中通过 <script> 标签覆盖）
export const API_BASE = window.API_CONFIG?.API_BASE || DEFAULT_API_BASE;

export const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

export const WEEKDAY_MAP = {
    '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 7
};

export const PERIOD_TIMES = {
    1: '08:10-09:00', 2: '09:05-09:55', 3: '10:15-11:05', 4: '11:10-12:00',
    5: '13:10-14:00', 6: '14:05-14:55', 7: '15:15-16:05', 8: '16:10-17:00',
    9: '17:10-18:00', 10: '18:20-19:10', 11: '19:15-20:05', 12: '20:10-21:00',
    13: '21:05-21:55', 14: '12:05-12:55'
};

export const PERIOD_ORDER = [1, 2, 3, 4, 14, 5, 6, 7, 8, 9, 10, 11, 12, 13];
export const DEFAULT_YEAR = 114;
export const DEFAULT_SEMESTER = 2;