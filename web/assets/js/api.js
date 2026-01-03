/**
 * API 請求模組
 * 
 * 提供統一的 API 調用接口，包含錯誤處理和重試機制
 */
import { API_BASE } from './config.js';

/**
 * 統一的 API 請求處理函數
 * @param {string} endpoint - API 端點路徑
 * @param {Object} options - fetch 選項
 * @returns {Promise<Object>} API 響應數據
 */
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };

    try {
        const response = await fetch(url, config);

        if (!response.ok) {
            // 嘗試解析錯誤訊息
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || errorData.message || errorMessage;
            } catch (e) {
                // 如果無法解析 JSON，使用默認錯誤訊息
            }
            throw new Error(errorMessage);
        }

        return await response.json();
    } catch (error) {
        // 網絡錯誤或其他錯誤
        if (error instanceof TypeError && error.message.includes('fetch')) {
            throw new Error('無法連接到服務器，請檢查網絡連接或 API 地址配置');
        }
        throw error;
    }
}

/**
 * 獲取所有課程
 * @param {number} year - 學年度
 * @param {number} semester - 學期
 * @returns {Promise<Object>} 課程列表和總數
 */
export async function fetchAllCourses(year, semester) {
    return apiRequest(`/courses/all?year=${year}&semester=${semester}`);
}

/**
 * 獲取科系列表
 * @param {number} year - 學年度（可選）
 * @param {number} semester - 學期（可選）
 * @returns {Promise<Object>} 科系列表
 */
export async function fetchDepartments(year, semester) {
    const params = new URLSearchParams();
    if (year) params.append('year', year);
    if (semester) params.append('semester', semester);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`/departments${query}`);
}

/**
 * 根據班級獲取課程
 * @param {string} department - 科系
 * @param {string} grade - 年級
 * @param {string} className - 班級名稱
 * @param {number} year - 學年度
 * @param {number} semester - 學期
 * @returns {Promise<Object>} 課程列表
 */
export async function fetchCoursesByClass(department, grade, className, year, semester) {
    const params = new URLSearchParams({
        department: department,
        grade: grade,
        class_name: className,
        year: year.toString(),
        semester: semester.toString()
    });
    return apiRequest(`/courses/by-class?${params.toString()}`);
}

/**
 * 獲取課程推薦
 * @param {Object} payload - 推薦條件
 * @returns {Promise<Object>} 推薦課程列表
 */
export async function fetchRecommendations(payload) {
    return apiRequest('/courses/recommend', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

/**
 * 搜索課程歷史記錄
 * @param {string} query - 搜索關鍵詞
 * @param {number} limit - 結果數量限制（默認 100）
 * @returns {Promise<Object>} 歷史課程列表
 */
export async function fetchHistory(query, limit = 100) {
    const params = new URLSearchParams({
        q: query,
        limit: limit.toString()
    });
    return apiRequest(`/courses/history?${params.toString()}`);
}

/**
 * 搜索課程
 * @param {string} query - 搜索關鍵詞
 * @param {number} limit - 結果數量限制（默認 50）
 * @returns {Promise<Object>} 搜索結果
 */
export async function searchCourses(query, limit = 50) {
    const params = new URLSearchParams({
        q: query,
        limit: limit.toString()
    });
    return apiRequest(`/courses/search?${params.toString()}`);
}

/**
 * 獲取課程統計數據
 * @returns {Promise<Object>} 統計數據
 */
export async function fetchStats() {
    return apiRequest('/courses/stats');
}

/**
 * 獲取單個課程詳情
 * @param {string} courseId - 課程代碼
 * @returns {Promise<Object>} 課程詳情
 */
export async function fetchCourseDetail(courseId) {
    return apiRequest(`/courses/${encodeURIComponent(courseId)}`);
}

/**
 * 健康檢查
 * @returns {Promise<Object>} 健康狀態
 */
export async function healthCheck() {
    return apiRequest('/health');
}
