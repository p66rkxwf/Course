/**
 * Course Master - 智慧選課輔助系統
 * 主 JavaScript 文件
 */

// 全局變量
const API_BASE = '/api';
let selectedCourses = []; // 已選課程列表
let currentSchedule = {}; // 當前課表 {day: {period: course}}

let allCoursesData = []; // 所有課程數據
let currentYear = 114;
let currentSemester = 1;

// 星期映射
const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];
const WEEKDAY_MAP = {
    '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 7
};

// 節次時間映射
const PERIOD_TIMES = {
    1: '08:10-09:00', 2: '09:10-10:00', 3: '10:20-11:10', 4: '11:20-12:10',
    5: '13:20-14:10', 6: '14:20-15:10', 7: '15:30-16:20', 8: '16:30-17:20',
    9: '18:10-19:00', 10: '19:10-20:00', 11: '20:10-21:00', 12: '21:10-22:00'
};

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

/**
 * 初始化應用
 */
async function initializeApp() {
    // 初始化課表
    initializeSchedule();
    
    // 載入課程數據
    await loadCoursesData();
    
    // 載入系所列表
    await loadDepartments();
    
    // 初始化事件監聽
    setupEventListeners();
    
    // 從本地存儲載入數據
    loadFromLocalStorage();
    
    // 更新顯示
    updateScheduleDisplay();
    updateSelectedCoursesList();
    

}

/**
 * 初始化課表結構
 */
function initializeSchedule() {
    const container = document.getElementById('schedule-table');
    let html = '<table class="schedule-table table-bordered"><thead><tr><th>節次</th>';
    
    // 星期標題
    for (let day of WEEKDAYS) {
        html += `<th>週${day}</th>`;
    }
    html += '</tr></thead><tbody>';
    
    // 生成12個節次
    for (let period = 1; period <= 12; period++) {
        html += `<tr><td class="time-cell">${PERIOD_TIMES[period] || `第${period}節`}</td>`;
        for (let day of WEEKDAYS) {
            const dayNum = WEEKDAY_MAP[day];
            html += `<td class="schedule-cell-empty" data-day="${dayNum}" data-period="${period}"></td>`;
        }
        html += '</tr>';
    }
    
    html += '</tbody></table>';
    container.innerHTML = html;
    
    // 初始化課表數據結構
    for (let day = 1; day <= 7; day++) {
        currentSchedule[day] = {};
    }
}

/**
 * 載入課程數據
 */
async function loadCoursesData() {
    try {
        const response = await fetch(`${API_BASE}/courses/all?year=${currentYear}&semester=${currentSemester}`);
        if (response.ok) {
            const data = await response.json();
            allCoursesData = data.courses || [];
            console.log(`載入 ${allCoursesData.length} 門課程`);
        }
    } catch (error) {
        console.error('載入課程數據失敗:', error);
        showAlert('載入課程數據失敗，請稍後再試', 'danger');
    }
}

/**
 * 載入系所列表
 */
async function loadDepartments() {
    try {
        const response = await fetch(`${API_BASE}/departments?year=${currentYear}&semester=${currentSemester}`);
        if (response.ok) {
            const data = await response.json();
            const departments = data.departments || [];
            const select = document.getElementById('select-department');
            select.innerHTML = '<option value="">選擇系所</option>';
            departments.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept;
                option.textContent = dept;
                select.appendChild(option);
            });
            
            // 系所選擇改變時更新班級列表
            select.addEventListener('change', function() {
                updateClassList(this.value);
            });
        }
    } catch (error) {
        console.error('載入系所列表失敗:', error);
    }
}

/**
 * 載入科系列表（基於選擇的學院）
 */
async function loadDepartmentsByCollege(college, targetSelectId) {
    try {
        const response = await fetch(`${API_BASE}/courses/all?year=${currentYear}&semester=${currentSemester}`);
        if (response.ok) {
            const data = await response.json();
            const courses = data.courses || [];
            
            // 從課程數據中提取該學院的科系
            const departments = new Set();
            courses.forEach(course => {
                if (course.學院 === college && course.開課班別 && course.開課班別.trim()) {
                    // 提取科系名稱（通常是開課班別的簡稱）
                    const dept = course.開課班別;
                    if (dept) departments.add(dept);
                }
            });
            
            const select = document.getElementById(targetSelectId);
            select.innerHTML = '<option value="">選擇科系</option>';
            
            Array.from(departments).sort().forEach(dept => {
                const option = document.createElement('option');
                option.value = dept;
                option.textContent = dept;
                select.appendChild(option);
            });
            
            // 科系選擇改變時更新班級列表
            select.addEventListener('change', function() {
                updateClassListByDepartment(college, this.value, targetSelectId.replace('department', 'class'));
            });
        }
    } catch (error) {
        console.error('載入科系列表失敗:', error);
    }
}

/**
 * 更新班級列表
 */
function updateClassList(department) {
    const select = document.getElementById('select-class');
    select.innerHTML = '<option value="">選擇班級</option>';
    
    if (!department) return;
    
    // 從課程數據中提取該系所的班級
    const classes = new Set();
    allCoursesData.forEach(course => {
        const dept = course['開課班別(代表)'] || '';
        if (dept.includes(department)) {
            // 嘗試提取班級信息（例如：資訊管理學系二年級A班）
            const match = dept.match(/(\d+年級[AB]?班?)/);
            if (match) {
                classes.add(match[1]);
            }
        }
    });
    
    Array.from(classes).sort().forEach(className => {
        const option = document.createElement('option');
        option.value = className;
        option.textContent = className;
        select.appendChild(option);
    });
}

/**
 * 更新班級列表（基於學院和科系）
 */
function updateClassListByDepartment(college, department, targetSelectId) {
    const select = document.getElementById(targetSelectId);
    select.innerHTML = '<option value="">選擇班級</option>';
    
    if (!college || !department) return;
    
    // 從課程數據中提取該學院和科系的班級
    const classes = new Set();
    allCoursesData.forEach(course => {
        if (course.學院 === college && course.開課班別 === department) {
            // 嘗試提取班級信息
            const classInfo = course.班級 || '';
            if (classInfo) {
                classes.add(classInfo);
            }
        }
    });
    
    Array.from(classes).sort().forEach(className => {
        const option = document.createElement('option');
        option.value = className;
        option.textContent = className;
        select.appendChild(option);
    });
}

/**
 * 更新年級列表（基於學院和科系）
 */
function updateGradeList(targetSelectId, college, department) {
    const select = document.getElementById(targetSelectId);
    select.innerHTML = '<option value="">選擇年級</option>';
    
    if (!college || !department) return;
    
    // 從課程數據中提取該學院和科系的年級
    const grades = new Set();
    allCoursesData.forEach(course => {
        if (course.學院 === college && course.開課班別 === department) {
            const grade = course.年級 || '';
            if (grade) {
                grades.add(grade);
            }
        }
    });
    
    // 添加大學部年級
    const undergradGrades = ['1', '2', '3', '4'];
    const hasUndergrad = Array.from(grades).some(g => undergradGrades.includes(g));
    
    // 添加研究所年級
    const gradGrades = ['碩士1', '碩士2', '博士1', '博士2', '博士3'];
    const hasGrad = Array.from(grades).some(g => gradGrades.includes(g.replace('年級', '')));
    
    if (hasUndergrad) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = '大學部';
        undergradGrades.forEach(grade => {
            if (grades.has(grade)) {
                const option = document.createElement('option');
                option.value = grade;
                option.textContent = grade + '年級';
                optgroup.appendChild(option);
            }
        });
        select.appendChild(optgroup);
    }
    
    if (hasGrad) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = '研究所';
        gradGrades.forEach(grade => {
            const gradeValue = grade.replace('碩士', '碩士').replace('博士', '博士');
            if (grades.has(grade.replace('1', '').replace('2', '').replace('3', ''))) {
                const option = document.createElement('option');
                option.value = grade;
                option.textContent = grade.replace('1', '一年級').replace('2', '二年級').replace('3', '三年級');
                optgroup.appendChild(option);
            }
        });
        select.appendChild(optgroup);
    }
}

/**
 * 更新班級列表（基於年級）
 */
function updateClassListByGrade(college, department, grade, targetSelectId) {
    const select = document.getElementById(targetSelectId);
    select.innerHTML = '<option value="">選擇班級</option>';
    
    if (!college || !department || !grade) return;
    
    // 從課程數據中提取該條件下的班級
    const classes = new Set();
    allCoursesData.forEach(course => {
        if (course.學院 === college && course.開課班別 === department && course.年級 === grade) {
            const classInfo = course.班級 || '';
            if (classInfo) {
                classes.add(classInfo);
            }
        }
    });
    
    Array.from(classes).sort().forEach(className => {
        const option = document.createElement('option');
        option.value = className;
        option.textContent = className;
        select.appendChild(option);
    });
}

/**
 * 設置事件監聽
 */
function setupEventListeners() {
    // 一鍵導入
    document.getElementById('btn-import').addEventListener('click', handleImportCourses);
    
    // 清空課表
    document.getElementById('btn-clear').addEventListener('click', handleClearSchedule);
    
    // 推薦功能
    document.getElementById('btn-search-recommend').addEventListener('click', handleSearchRecommend);
    document.getElementById('range-credits').addEventListener('input', function() {
        document.getElementById('target-credits').textContent = this.value;
    });
    
    // 類別按鈕
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // 歷年資料搜尋
    document.getElementById('btn-search-history').addEventListener('click', handleSearchHistory);
    document.getElementById('search-history-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleSearchHistory();
        }
    });
    
    // 學期選擇
    document.getElementById('select-year').addEventListener('change', function() {
        currentYear = parseInt(this.value);
        loadCoursesData();
    });
    
    document.getElementById('select-semester').addEventListener('change', function() {
        currentSemester = parseInt(this.value);
        loadCoursesData();
    });
    
    // 課表選擇器監聽器
    document.getElementById('select-college-schedule').addEventListener('change', function() {
        const college = this.value;
        loadDepartmentsByCollege(college, 'select-department-schedule');
        // 清空後續選擇器
        document.getElementById('select-grade-schedule').innerHTML = '<option value="">選擇年級</option>';
        document.getElementById('select-class-schedule').innerHTML = '<option value="">選擇班級</option>';
    });
    
    document.getElementById('select-department-schedule').addEventListener('change', function() {
        const college = document.getElementById('select-college-schedule').value;
        const department = this.value;
        if (college && department) {
            updateGradeList('select-grade-schedule', college, department);
        }
    });
    
    document.getElementById('select-grade-schedule').addEventListener('change', function() {
        const college = document.getElementById('select-college-schedule').value;
        const department = document.getElementById('select-department-schedule').value;
        const grade = this.value;
        if (college && department && grade) {
            updateClassListByGrade(college, department, grade, 'select-class-schedule');
        }
    });
}

/**
 * 處理一鍵導入
 */
async function handleImportCourses() {
    const college = document.getElementById('select-college-schedule').value;
    const department = document.getElementById('select-department-schedule').value;
    const grade = document.getElementById('select-grade-schedule').value;
    const className = document.getElementById('select-class-schedule').value;
    
    if (!college || !department || !grade || !className) {
        showAlert('請先選擇學院、科系、年級和班級', 'warning');
        return;
    }
    
    try {
        // 顯示載入中
        const btn = document.getElementById('btn-import');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>載入中...';
        btn.disabled = true;
        
        // 獲取該班級的必選修課程
        const response = await fetch(`${API_BASE}/courses/by-class?department=${encodeURIComponent(department)}&class=${encodeURIComponent(className)}&year=${currentYear}&semester=${currentSemester}`);
        
        if (response.ok) {
            const data = await response.json();
            const courses = data.courses || [];
            
            // 添加到課表
            courses.forEach(course => {
                addCourseToSchedule(course);
            });
            
            updateScheduleDisplay();
            updateSelectedCoursesList();
            saveToLocalStorage();
            
            showAlert(`成功導入 ${courses.length} 門課程`, 'success');
        } else {
            showAlert('導入失敗，請稍後再試', 'danger');
        }
        
        btn.innerHTML = originalText;
        btn.disabled = false;
    } catch (error) {
        console.error('導入課程失敗:', error);
        showAlert('導入失敗，請稍後再試', 'danger');
        document.getElementById('btn-import').disabled = false;
    }
}

/**
 * 處理清空課表
 */
function handleClearSchedule() {
    Swal.fire({
        title: '確定要清空所有課程嗎？',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '確定',
        cancelButtonText: '取消'
    }).then(result => {
        if (result.isConfirmed) {
            selectedCourses = [];
            currentSchedule = {};
            for (let day = 1; day <= 7; day++) {
                currentSchedule[day] = {};
            }
            updateScheduleDisplay();
            updateSelectedCoursesList();
            saveToLocalStorage();
            showAlert('課表已清空', 'info');
        }
    });
}

/**
 * 添加課程到課表
 */
function addCourseToSchedule(course) {
    // 檢查是否已存在
    if (selectedCourses.find(c => c.課程代碼 === course.課程代碼 && c.序號 === course.序號)) {
        return false;
    }
    
    // 檢查時間衝突
    const day = WEEKDAY_MAP[course.星期] || parseInt(course.星期);
    if (!day) return false;
    
    const startPeriod = parseInt(course.起始節次);
    const endPeriod = parseInt(course.結束節次);
    
    if (startPeriod && endPeriod) {
        for (let p = startPeriod; p <= endPeriod; p++) {
            if (currentSchedule[day] && currentSchedule[day][p]) {
                // 時間衝突
                showAlert(`課程 "${course.課程名稱}" 與現有課程時間衝突`, 'warning');
                return false;
            }
        }
    }
    
    // 添加到列表
    selectedCourses.push(course);
    
    // 添加到課表
    if (startPeriod && endPeriod) {
        for (let p = startPeriod; p <= endPeriod; p++) {
            if (!currentSchedule[day]) currentSchedule[day] = {};
            currentSchedule[day][p] = course;
        }
    }
    
    return true;
}

/**
 * 從課表移除課程
 */
function removeCourseFromSchedule(course) {
    selectedCourses = selectedCourses.filter(c => 
        !(c.課程代碼 === course.課程代碼 && c.序號 === course.序號)
    );
    
    const day = WEEKDAY_MAP[course.星期] || parseInt(course.星期);
    if (day && currentSchedule[day]) {
        const startPeriod = parseInt(course.起始節次);
        const endPeriod = parseInt(course.結束節次);
        if (startPeriod && endPeriod) {
            for (let p = startPeriod; p <= endPeriod; p++) {
                delete currentSchedule[day][p];
            }
        }
    }
}

/**
 * 更新課表顯示
 */
function updateScheduleDisplay() {
    // 清空所有單元格
    document.querySelectorAll('.schedule-cell-empty').forEach(cell => {
        cell.innerHTML = '';
        cell.className = 'schedule-cell-empty';
    });
    
    // 填充課程
    selectedCourses.forEach(course => {
        const day = WEEKDAY_MAP[course.星期] || parseInt(course.星期);
        const startPeriod = parseInt(course.起始節次);
        const endPeriod = parseInt(course.結束節次);
        
        if (day && startPeriod && endPeriod) {
            const cell = document.querySelector(
                `td[data-day="${day}"][data-period="${startPeriod}"]`
            );
            
            if (cell) {
                const span = endPeriod - startPeriod + 1;
                cell.rowSpan = span;
                
                // 確定課程類型樣式
                let courseType = 'course-elective';
                if (course.課程性質 && course.課程性質.includes('必修')) {
                    courseType = 'course-required';
                } else if (course.課程性質 && (course.課程性質.includes('通識') || course.課程性質.includes('通識'))) {
                    courseType = 'course-general';
                } else if (course.課程性質 && (course.課程性質.includes('國文') || course.課程性質.includes('英文'))) {
                    courseType = 'course-language';
                }
                
                cell.className = `schedule-cell ${courseType}`;
                cell.innerHTML = `
                    <div class="course-name">${course.課程名稱 || course.中文課程名稱 || ''}</div>
                    <div class="course-teacher">${course.教師姓名 || ''}</div>
                    <div class="course-info">${course.上課地點 || ''}</div>
                `;
                
                cell.onclick = () => showCourseDetail(course);
                
                // 隱藏被合併的單元格
                for (let p = startPeriod + 1; p <= endPeriod; p++) {
                    const nextCell = document.querySelector(
                        `td[data-day="${day}"][data-period="${p}"]`
                    );
                    if (nextCell) {
                        nextCell.style.display = 'none';
                    }
                }
            }
        }
    });
}

/**
 * 更新已選課程列表
 */
function updateSelectedCoursesList() {
    const container = document.getElementById('selected-courses-list');
    const totalCredits = selectedCourses.reduce((sum, c) => sum + (parseFloat(c.學分) || 0), 0);
    
    document.getElementById('total-credits').textContent = totalCredits;
    document.getElementById('current-credits').textContent = totalCredits;
    
    if (selectedCourses.length === 0) {
        container.innerHTML = '<div class="col-12 text-center text-muted py-4">尚未選擇任何課程</div>';
        return;
    }
    
    container.innerHTML = selectedCourses.map(course => {
        const day = course.星期 || '';
        const time = course.起始節次 && course.結束節次 
            ? `第${course.起始節次}-${course.結束節次}節` 
            : '';
        
        return `
            <div class="col-md-6 col-lg-4">
                <div class="card course-card h-100">
                    <div class="card-body">
                        <h6 class="card-title text-truncate">${course.課程名稱 || course.中文課程名稱 || ''}</h6>
                        <p class="card-text small text-muted mb-2">
                            ${course.教師姓名 || ''} • ${course.學分 || 0} 學分
                        </p>
                        <p class="card-text small text-muted mb-2">
                            <i class="fas fa-university me-1"></i>${course.學院 || ''} ${course.科系 || ''} ${course.年級 || ''}${course.班級 || ''}
                        </p>
                        <p class="card-text small">
                            <i class="far fa-clock me-1"></i>週${day} ${time}<br>
                            <i class="fas fa-map-marker-alt me-1"></i>${course.上課地點 || ''}
                        </p>
                        <button class="btn btn-sm btn-outline-danger" onclick="removeCourse('${course.課程代碼}', '${course.序號}')">
                            <i class="fas fa-trash me-1"></i>移除
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * 移除課程
 */
function removeCourse(courseCode, serial) {
    const course = selectedCourses.find(c => c.課程代碼 === courseCode && c.序號 === serial);
    if (course) {
        removeCourseFromSchedule(course);
        updateScheduleDisplay();
        updateSelectedCoursesList();
        saveToLocalStorage();
        showAlert('課程已移除', 'info');
    }
}

/**
 * 處理課程推薦
 */
async function handleSearchRecommend() {
    const emptySlotsOnly = document.getElementById('check-empty-slots').checked;
    const targetCredits = parseInt(document.getElementById('range-credits').value);
    const currentCredits = selectedCourses.reduce((sum, c) => sum + (parseFloat(c.學分) || 0), 0);
    const neededCredits = targetCredits - currentCredits;
    
    if (neededCredits <= 0) {
        showAlert('已達到目標學分數', 'info');
        return;
    }
    
    // 獲取選中的類別
    const activeCategory = document.querySelector('.category-btn.active');
    const category = activeCategory ? activeCategory.dataset.category : '通識';
    
    // 獲取部門篩選條件
    const selectedCollege = document.getElementById('select-college').value;
    const selectedGrade = document.getElementById('select-grade').value;
    
    try {
        const btn = document.getElementById('btn-search-recommend');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>搜尋中...';
        
        // 計算空堂時段
        const emptySlots = getEmptySlots();
        
        const response = await fetch(`${API_BASE}/courses/recommend`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                empty_slots: emptySlotsOnly ? emptySlots : null,
                target_credits: neededCredits,
                category: category,
                college: selectedCollege || null,
                grade: selectedGrade || null,
                current_courses: selectedCourses.map(c => ({
                    code: c.課程代碼,
                    serial: c.序號
                }))
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            displayRecommendResults(data.courses || []);
        } else {
            showAlert('推薦失敗，請稍後再試', 'danger');
        }
        
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-search me-2"></i> 開始推薦';
    } catch (error) {
        console.error('推薦失敗:', error);
        showAlert('推薦失敗，請稍後再試', 'danger');
        document.getElementById('btn-search-recommend').disabled = false;
    }
}

/**
 * 獲取空堂時段
 */
function getEmptySlots() {
    const emptySlots = [];
    for (let day = 1; day <= 7; day++) {
        for (let period = 1; period <= 12; period++) {
            if (!currentSchedule[day] || !currentSchedule[day][period]) {
                emptySlots.push({ day, period });
            }
        }
    }
    return emptySlots;
}

/**
 * 顯示推薦結果
 */
function displayRecommendResults(courses) {
    const container = document.getElementById('recommend-courses-grid');
    
    if (courses.length === 0) {
        container.innerHTML = '<div class="col-12 text-center text-muted py-5">沒有找到符合條件的課程</div>';
        return;
    }
    
    container.innerHTML = courses.map((course, index) => {
        const enrollmentRate = course.上限人數 > 0 
            ? (course.選上人數 / course.上限人數 * 100).toFixed(0) 
            : 0;
        const isFull = enrollmentRate >= 100;
        const day = course.星期 || '';
        const time = course.起始節次 && course.結束節次 
            ? `週${day} 第${course.起始節次}-${course.結束節次}節` 
            : '';
        
        // 確定類別標籤
        let categoryBadge = '';
        if (course.課程性質 && course.課程性質.includes('通識')) {
            categoryBadge = '<span class="badge bg-primary">通識</span>';
        } else if (course.課程性質 && course.課程性質.includes('國文')) {
            categoryBadge = '<span class="badge bg-success">國文</span>';
        } else if (course.課程性質 && course.課程性質.includes('英文')) {
            categoryBadge = '<span class="badge bg-info">英文</span>';
        }
        
        const courseId = `course-${index}`;
        
        return `
            <div class="col-md-6 col-lg-4">
                <div class="card course-card h-100">
                    ${isFull ? '<div class="position-absolute top-0 end-0 m-2"><span class="badge bg-danger">爆滿</span></div>' : ''}
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            ${categoryBadge}
                            <small class="text-muted"><i class="far fa-clock me-1"></i>${time}</small>
                        </div>
                        <h5 class="card-title text-truncate">${course.課程名稱 || course.中文課程名稱 || ''}</h5>
                        <p class="card-text small text-muted mb-2">
                            ${course.教師姓名 || ''} • ${course.學分 || 0} 學分
                        </p>
                        <p class="card-text small text-muted mb-2">
                            <i class="fas fa-university me-1"></i>${course.學院 || ''} ${course.科系 || ''} ${course.年級 || ''}${course.班級 || ''}
                        </p>
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <small class="text-muted">
                                選課人數: <span class="${isFull ? 'text-danger fw-bold' : 'text-success'}">${course.選上人數 || 0}/${course.上限人數 || 0}</span>
                            </small>
                            <span class="badge ${isFull ? 'bg-danger' : 'bg-success'}">${enrollmentRate}%</span>
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-outline-primary flex-grow-1" onclick='showCourseDetailModal(${index})'>
                                <i class="fas fa-info-circle me-1"></i>詳情
                            </button>
                            <button class="btn btn-sm btn-primary flex-grow-1" onclick='addRecommendedCourseByIndex(${index})'>
                                <i class="fas fa-plus me-1"></i>加入
                            </button>

                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // 保存推薦課程到全局變量
    window.recommendedCourses = courses;
}

// 輔助函數：通過索引操作推薦課程
window.showCourseDetailModal = function(index) {
    if (window.recommendedCourses && window.recommendedCourses[index]) {
        showCourseDetail(window.recommendedCourses[index]);
    }
};

window.addRecommendedCourseByIndex = function(index) {
    if (window.recommendedCourses && window.recommendedCourses[index]) {
        addRecommendedCourse(window.recommendedCourses[index]);
    }
};



/**
 * 添加推薦的課程
 */
function addRecommendedCourse(course) {
    if (addCourseToSchedule(course)) {
        updateScheduleDisplay();
        updateSelectedCoursesList();
        saveToLocalStorage();
        showAlert('課程已加入課表', 'success');
    }
}

/**
 * 追蹤課程
 */


/**
 * 處理歷年資料搜尋
 */
async function handleSearchHistory() {
    const query = document.getElementById('search-history-input').value.trim();
    
    if (!query) {
        showAlert('請輸入搜尋關鍵字', 'warning');
        return;
    }
    
    try {
        const btn = document.getElementById('btn-search-history');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>搜尋中...';
        
        const response = await fetch(`${API_BASE}/courses/history?q=${encodeURIComponent(query)}`);
        
        if (response.ok) {
            const data = await response.json();
            displayHistoryResults(data.courses || [], query);
        } else {
            showAlert('搜尋失敗，請稍後再試', 'danger');
        }
        
        btn.disabled = false;
        btn.innerHTML = '搜尋';
    } catch (error) {
        console.error('搜尋失敗:', error);
        showAlert('搜尋失敗，請稍後再試', 'danger');
        document.getElementById('btn-search-history').disabled = false;
    }
}

/**
 * 顯示歷年資料結果
 */
function displayHistoryResults(courses, query) {
    const tbody = document.getElementById('history-results-tbody');
    const title = document.getElementById('history-search-title');
    const count = document.getElementById('history-result-count');
    
    title.textContent = `搜尋結果："${query}"`;
    count.textContent = `共 ${courses.length} 筆資料`;
    
    if (courses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" class="text-center text-muted py-5">沒有找到相關資料</td></tr>';
        return;
    }
    
    tbody.innerHTML = courses.map(course => {
        const enrollmentRate = course.上限人數 > 0 
            ? (course.選上人數 / course.上限人數 * 100).toFixed(0) 
            : 0;
        const isFull = enrollmentRate >= 100;
        const day = course.星期 || '';
        const time = course.起始節次 && course.結束節次 
            ? `(週${day}) 第${course.起始節次}-${course.結束節次}節` 
            : '';
        
        return `
            <tr>
                <td>${course.學年度 || ''}</td>
                <td>${course.學期 || ''}</td>
                <td>${course.學院 || ''}</td>
                <td>${course.科系 || ''}</td>
                <td>${course.年級 || ''}</td>
                <td>${course.班級 || ''}</td>
                <td class="fw-bold">${course.課程名稱 || course.中文課程名稱 || ''}</td>
                <td>${course.教師姓名 || ''}</td>
                <td class="text-center">${course.上限人數 || 0}</td>
                <td class="text-center">${course.選上人數 || 0}</td>
                <td class="text-center">
                    <span class="badge ${isFull ? 'bg-danger' : 'bg-success'}">${enrollmentRate}%</span>
                </td>
                <td class="text-muted">${time}</td>
            </tr>
        `;
    }).join('');
}

/**
 * 顯示課程詳情
 */
function showCourseDetail(course) {
    const modal = new bootstrap.Modal(document.getElementById('courseDetailModal'));
    const title = document.getElementById('courseDetailTitle');
    const body = document.getElementById('courseDetailBody');
    
    title.textContent = course.課程名稱 || course.中文課程名稱 || '課程詳情';
    
    const day = course.星期 || '';
    const time = course.起始節次 && course.結束節次 
        ? `週${day} 第${course.起始節次}-${course.結束節次}節` 
        : '';
    const enrollmentRate = course.上限人數 > 0 
        ? (course.選上人數 / course.上限人數 * 100).toFixed(1) 
        : 0;
    
    body.innerHTML = `
        <div class="row g-3">
            <div class="col-md-6">
                <strong>課程代碼：</strong>${course.課程代碼 || ''}
            </div>
            <div class="col-md-6">
                <strong>學分數：</strong>${course.學分 || 0}
            </div>
            <div class="col-md-6">
                <strong>教師：</strong>${course.教師姓名 || ''}
            </div>
            <div class="col-md-6">
                <strong>課程性質：</strong>${course.課程性質 || ''}
            </div>
            <div class="col-md-6">
                <strong>學院：</strong>${course.學院 || ''}
            </div>
            <div class="col-md-6">
                <strong>科系：</strong>${course.科系 || ''}
            </div>
            <div class="col-md-6">
                <strong>年級：</strong>${course.年級 || ''}
            </div>
            <div class="col-md-6">
                <strong>班級：</strong>${course.班級 || ''}
            </div>
            <div class="col-md-6">
                <strong>上課時間：</strong>${time}
            </div>
            <div class="col-md-6">
                <strong>上課地點：</strong>${course.上課地點 || ''}
            </div>
            <div class="col-md-6">
                <strong>選課人數：</strong>${course.選上人數 || 0} / ${course.上限人數 || 0}
            </div>
            <div class="col-md-6">
                <strong>爆滿率：</strong><span class="badge ${enrollmentRate >= 100 ? 'bg-danger' : 'bg-success'}">${enrollmentRate}%</span>
            </div>
            ${course.英文課程名稱 ? `<div class="col-12"><strong>英文名稱：</strong>${course.英文課程名稱}</div>` : ''}
            ${course.備註 ? `<div class="col-12"><strong>備註：</strong>${course.備註}</div>` : ''}
        </div>
    `;
    
    // 設置加入按鈕
    document.getElementById('btn-add-to-schedule').onclick = () => {
        modal.hide();
        addRecommendedCourse(course);
    };
    
    modal.show();
}











/**
 * 切換分頁
 */
function switchTab(tabId) {
    // 隱藏所有分頁
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.add('d-none');
    });

    // 顯示目標分頁
    const targetSection = document.getElementById(tabId);
    if (targetSection) {
        targetSection.classList.remove('d-none');
    }

    // 更新導航按鈕樣式
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    const activeBtn = Array.from(document.querySelectorAll('.nav-btn')).find(btn => 
        btn.getAttribute('onclick')?.includes(tabId)
    );

    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}

/**
 * 顯示提示訊息
 */
function showAlert(message, type = 'info') {
    const iconMap = { info: 'info', success: 'success', warning: 'warning', danger: 'error', error: 'error' };
    const icon = iconMap[type] || type;
    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: icon,
        title: message,
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
    });
}

/**
 * 保存到本地存儲
 */
function saveToLocalStorage() {
    try {
        localStorage.setItem('selectedCourses', JSON.stringify(selectedCourses));
        localStorage.setItem('currentSchedule', JSON.stringify(currentSchedule));

    } catch (error) {
        console.error('保存失敗:', error);
    }
}

/**
 * 從本地存儲載入
 */
function loadFromLocalStorage() {
    try {
        const savedCourses = localStorage.getItem('selectedCourses');
        const savedSchedule = localStorage.getItem('currentSchedule');
        const savedTracking = localStorage.getItem('trackingCourses');
        
        if (savedCourses) {
            selectedCourses = JSON.parse(savedCourses);
        }
        if (savedSchedule) {
            currentSchedule = JSON.parse(savedSchedule);
        }
    } catch (error) {
        console.error('載入失敗:', error);
    }
}
