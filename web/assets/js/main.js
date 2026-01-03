// Main controller — app initialization, event binding, and behavior for schedule view (table/cards/auto) 
import * as config from './config.js';
import { state, saveToLocalStorage, loadFromLocalStorage } from './state.js';
import * as api from './api.js';
import * as utils from './utils.js';
import * as ui from './ui.js';
let historyGroupsCache = [];
let historyChartInstance = null;

// 初始化
document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
    ui.initializeScheduleTable();
    await loadCoursesData();
    
    // 初始化系所選單
    await loadDepartments();
    
    // 綁定所有事件
    setupEventListeners();
    
    // 載入本地儲存的狀態
    loadFromLocalStorage();

    window.debugState = state;
    
    // 更新畫面顯示
    ui.updateScheduleDisplay();
    ui.updateSelectedCoursesList();
    
    // 將需要給 HTML onclick 呼叫的函數掛載到 window
    exposeGlobalFunctions();

    // 初始化檢視（讀取使用者偏好，若無則採用 table 為預設）
    if (window.toggleScheduleView) {
        const pref = localStorage.getItem('scheduleViewPref');
        if (pref === 'table' || pref === 'cards') window.toggleScheduleView(pref);
        else window.toggleScheduleView('table');
    }

    // 當視窗大小改變時（防抖），若目前為 auto 則自動切換表格 / 卡片視圖
    window.addEventListener('resize', debounce(detectAndApplyScheduleView, 200));
    // 立即執行一次以套用目前寬度的預設行為
    detectAndApplyScheduleView();
}

// ------------------------------------------
// 核心邏輯
// ------------------------------------------

async function loadCoursesData() {
    try {
        const data = await api.fetchAllCourses(state.currentYear, state.currentSemester);
        const raw = data.courses || [];
        // 使用 normalizeCourse 保證欄位一致
        state.allCoursesData = raw.map(c => utils.normalizeCourse ? utils.normalizeCourse(c) : c);
        console.log(`載入 ${state.allCoursesData.length} 門課程`);
    } catch (error) {
        console.error(error);
        ui.showAlert('載入課程數據失敗', 'danger');
    }
}

// 載入系所列表 (初始化用)
async function loadDepartments() {
    try {
        const data = await api.fetchDepartments(state.currentYear, state.currentSemester);
        const departments = data.departments || [];
        
        const select = document.getElementById('select-department-schedule');
        if (select) {
            select.innerHTML = '<option value="">選擇系所</option>';
            departments.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept;
                option.textContent = dept;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('載入系所列表失敗:', error);
    }
}

// 載入科系列表（基於選擇的學院）
async function loadDepartmentsByCollege(college, targetSelectId) {
    try {
        // 確保有課程數據
        if (state.allCoursesData.length === 0) {
            await loadCoursesData();
        }
        
        // 從課程數據中提取該學院的科系
        const departments = new Set();
        state.allCoursesData.forEach(course => {
            // 使用 `科系` 欄位
            if (course.學院 === college && course.科系) {
                departments.add(course.科系);
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

    } catch (error) {
        console.error('載入科系列表失敗:', error);
    }
}

// 更新班級列表（基於系所 - 模糊匹配用）
function updateClassList(department) {
    const select = document.getElementById('select-class-schedule');
    select.innerHTML = '<option value="">選擇班級</option>';
    
    if (!department) return;
    
    const classes = new Set();
    state.allCoursesData.forEach(course => {
        // 優先比對正規化的 `科系` 欄位
        if (course.科系 === department || (course['開課班別(代表)'] && course['開課班別(代表)'].includes(department))) {
            const classInfo = course.班級 || '';
            if (classInfo) classes.add(classInfo);
            
            // 兼容舊邏輯：如果沒有班級欄位，嘗試從字串解析
            if (!classInfo && course['開課班別(代表)']) {
                 const match = course['開課班別(代表)'].match(/(\d+年級[AB]?班?)/);
                 if (match) classes.add(match[1]);
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

// 更新年級列表（基於學院和科系）
function updateGradeList(targetSelectId, college, department) {
    const select = document.getElementById(targetSelectId);
    select.innerHTML = '<option value="">選擇年級</option>';
    
    if (!college || !department) return;
    
    const grades = new Set();
    state.allCoursesData.forEach(course => {
        // 使用 `科系` 欄位
        if (course.學院 === college && course.科系 === department) {
            const grade = course.年級 || '';
            if (grade) {
                grades.add(grade);
            }
        }
    });
    
    // 渲染年級選項 (保持不變)
    const undergradGrades = ['1', '2', '3', '4'];
    const hasUndergrad = Array.from(grades).some(g => undergradGrades.includes(g));
    
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
            // 簡化判斷邏輯
            const normalizedGrade = grade.replace(/[0-9]/g, ''); // 移除數字做模糊比對
            const match = Array.from(grades).find(g => g.includes(normalizedGrade));
            
            if (match || grades.has(grade)) {
                const option = document.createElement('option');
                option.value = grade;
                option.textContent = grade.replace('1', '一年級').replace('2', '二年級').replace('3', '三年級');
                optgroup.appendChild(option);
            }
        });
        select.appendChild(optgroup);
    }
}

// 更新班級列表（基於學院、科系和年級）
function updateClassListByGrade(college, department, grade, targetSelectId) {
    const select = document.getElementById(targetSelectId);
    select.innerHTML = '<option value="">選擇班級</option>';
    
    if (!college || !department || !grade) return;
    
    const classes = new Set();
    state.allCoursesData.forEach(course => {
        // 使用 `科系` 欄位
        if (course.學院 === college && course.科系 === department && course.年級 === grade) {
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

// ------------------------------------------
// 事件處理
// ------------------------------------------

function setupEventListeners() {
    // 點擊遮罩層關閉側邊欄 (RWD)
    document.addEventListener('click', function(e) {
        const sidebar = document.querySelector('.sidebar');
        // 如果側邊欄打開，且點擊的不是側邊欄本身也不是切換按鈕
        if (sidebar.classList.contains('show') && 
            !sidebar.contains(e.target) && 
            !e.target.closest('.sidebar-toggle')) {
            sidebar.classList.remove('show');
            // 移除 backdrop 顯示
            const backdrop = document.getElementById('sidebarBackdrop');
            if (backdrop) {
                backdrop.classList.remove('show');
                backdrop.setAttribute('aria-hidden', 'true');
            }
            // 同步 aria-expanded
            document.querySelectorAll('.sidebar-toggle').forEach(btn => btn.setAttribute('aria-expanded', 'false'));
        }
    });

    // 一鍵導入
    document.getElementById('btn-import').addEventListener('click', handleImportCourses);
    
    // 清空課表
    document.getElementById('btn-clear').addEventListener('click', handleClearSchedule);
    
    // 推薦功能
    document.getElementById('btn-search-recommend').addEventListener('click', handleSearchRecommend);
    document.getElementById('range-credits').addEventListener('input', function() {
        document.getElementById('target-credits').textContent = this.value;
        ui.updateSelectedCoursesList();
    });
    
    // 類別按鈕 
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // 1. 重置所有按鈕樣式為「空心」
            document.querySelectorAll('.category-btn').forEach(b => {
                b.classList.remove('active', 'btn-primary');
                b.classList.add('btn-outline-primary');
            });
            
            // 2. 設定當前按鈕樣式為「實心」
            this.classList.remove('btn-outline-primary');
            this.classList.add('active', 'btn-primary');
            
            // 3. 立即觸發推薦搜尋
            handleSearchRecommend();
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
        state.currentYear = parseInt(this.value);
        loadCoursesData();
    });
    
    // 學年度選擇
    document.getElementById('select-semester').addEventListener('change', function() {
        state.currentSemester = parseInt(this.value);
        loadCoursesData();
    });

    // 科系選擇器監聽器 
    document.getElementById('select-college').addEventListener('change', function() {
        const college = this.value;
        loadDepartmentsByCollege(college, 'select-dept-recommend');
    });
    
    // --------------------------------------
    // 課表選擇器監聽器 (4級聯動)
    // --------------------------------------
    
    document.getElementById('select-college-schedule').addEventListener('change', function() {
        const college = this.value;
        loadDepartmentsByCollege(college, 'select-department-schedule');
        document.getElementById('select-grade-schedule').innerHTML = '<option value="">選擇年級</option>';
        document.getElementById('select-class-schedule').innerHTML = '<option value="">選擇班級</option>';
    });
    
    document.getElementById('select-department-schedule').addEventListener('change', function() {
        const college = document.getElementById('select-college-schedule').value;
        const department = this.value;
        if (college && department) {
            updateGradeList('select-grade-schedule', college, department);
        } else if (department) {
             updateClassList(department);
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

// ------------------------------------------
// 業務邏輯處理
// ------------------------------------------

async function handleImportCourses() {
    const college = document.getElementById('select-college-schedule').value;
    const department = document.getElementById('select-department-schedule').value;
    const grade = document.getElementById('select-grade-schedule').value;
    const className = document.getElementById('select-class-schedule').value;

    if (!college || !department || !grade || !className) {
        ui.showAlert('請完整選擇條件 (學院、科系、年級、班級)', 'warning');
        return;
    }

    const btn = document.getElementById('btn-import');
    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>處理中...';

    try {
        // 1. 篩選出該班級的所有課程
        const targetCourses = state.allCoursesData.filter(course => {
            return course.學院 === college &&
                   course.科系 === department &&
                   course.年級 == grade &&
                   course.班級 === className;
        });

        if (targetCourses.length === 0) {
            ui.showAlert(`查無資料 (搜尋條件: ${state.currentYear}學年/${grade}年級/${className})`, 'warning');
            btn.disabled = false;
            btn.innerHTML = originalText;
            return;
        }

        // 模擬延遲 UI
        await new Promise(r => setTimeout(r, 200));

        let addedCount = 0;
        let skippedCount = 0;

        // 2. 逐一處理每一門課 (使用 for...of 以支援 await)
        for (const rawCourse of targetCourses) {
            const course = utils.normalizeCourse(rawCourse);
            
            // 如果已經有了，直接跳過
            if (utils.isCourseSelected(course)) {
                skippedCount++;
                continue;
            }

            let resolved = false;

            // 3. 使用 while 迴圈處理衝突 (因為一門課可能連續衝突多門，解決一個還有下一個)
            while (!resolved) {
                const check = utils.checkTimeConflict(course);

                if (!check.hasConflict) {
                    // 沒有衝突 -> 直接加入
                    utils.addCourseToState(course);
                    addedCount++;
                    resolved = true;
                } else {
                    // 發生衝突 -> 找出是誰擋路
                    const existingCourse = check.conflictingCourse;

                    // 4. 跳出 Modal 讓使用者二選一
                    // 這裡會暫停程式執行，直到使用者點擊按鈕
                    const userChoice = await ui.showConflictResolutionModal(course, existingCourse);

                    if (userChoice === 'replace') {
                        // 使用者選擇「改選新課程」
                        // 先移除舊的
                        utils.removeCourseFromState(existingCourse.課程代碼, existingCourse.序號);
                        // 迴圈繼續 (continue while)，再次檢查是否還有其他衝突 (例如 3學分 vs 2+1學分)
                    } else {
                        // 使用者選擇「保留原課程」
                        // 放棄這門新課，跳出 while
                        skippedCount++;
                        resolved = true; 
                    }
                }
            }
        }

        // 5. 全部處理完畢，更新畫面
        ui.updateScheduleDisplay();
        ui.updateSelectedCoursesList();
        saveToLocalStorage();

        if (addedCount > 0) {
            ui.showAlert(`成功導入 ${addedCount} 門課程${skippedCount > 0 ? ` (略過 ${skippedCount} 門)` : ''}`, 'success');
        } else {
            ui.showAlert('未導入任何新課程 (皆已存在或選擇略過)', 'info');
        }

    } catch (error) {
        console.error(error);
        ui.showAlert('導入過程發生錯誤', 'danger');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// ... (handleClearSchedule, handleSearchRecommend, handleSearchHistory 等函式保持不變) ...
function handleClearSchedule() {
    Swal.fire({
        title: '確定要清空所有課程嗎？',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '確定',
        cancelButtonText: '取消'
    }).then(result => {
        if (result.isConfirmed) {
            state.selectedCourses = [];
            state.currentSchedule = {};
            for (let day = 1; day <= 7; day++) state.currentSchedule[day] = {};
            ui.updateScheduleDisplay();
            ui.updateSelectedCoursesList();
            saveToLocalStorage();
            ui.showAlert('課表已清空', 'info');
        }
    });
}

async function handleSearchRecommend() {
    const emptySlotsOnly = document.getElementById('check-empty-slots').checked;
    
    // 獲取勾選的星期
    const selectedDays = Array.from(document.querySelectorAll('.day-filter:checked')).map(cb => cb.value);

    if (selectedDays.length === 0) {
        ui.showAlert('請至少選擇一天', 'warning');
        return;
    }

    const targetCredits = 99; 

    // 獲取選中的類別
    const activeCategory = document.querySelector('.category-btn.active');
    // 若無選中則預設為 核心通識
    const category = activeCategory ? activeCategory.dataset.category : '核心通識';
    
    // 獲取使用者的身分 (學院/年級)
    const userCollege = document.getElementById('select-college-schedule').value;
    
    // 搜尋參數
    let searchCollege = document.getElementById('select-college').value;
    let searchDept = document.getElementById('select-dept-recommend') ? document.getElementById('select-dept-recommend').value : null;
    let searchGrade = document.getElementById('select-grade').value;

    // 定義哪些類別是全校性的，不應受限於使用者的搜尋選單 (系外選修除外)
    const isGlobalCategory = [
        '核心通識', '精進中文', '精進英外文', 
        '教育學程', '大二體育', '大三、四體育'
    ].includes(category);

    if (isGlobalCategory) {
        searchCollege = null;
        searchDept = null;
        searchGrade = null;
    }

    // 檢查空堂
    if (emptySlotsOnly && utils.getEmptySlots().length === 0) {
        ui.showAlert('目前沒有空堂，請取消「只顯示空堂」或先清空課表', 'warning');
        return;
    }

    let searchYear = state.currentYear;
    let searchSemester = state.currentSemester;
    if (state.selectedCourses.length > 0) {
        const firstCourse = state.selectedCourses[0];
        if (firstCourse.學年度 && firstCourse.學期) {
            searchYear = parseInt(firstCourse.學年度);
            searchSemester = parseInt(firstCourse.學期);
        }
    }

    const btn = document.getElementById('btn-search-recommend');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>搜尋中...';

    try {        

        let apiCategory = category;

        // 系外選修防呆
        if (category === '系外選修' && !searchDept) {
            throw new Error('請選擇「系外選修」的目標學院與科系');
        }

        const payload = {
            empty_slots: emptySlotsOnly ? utils.getEmptySlots() : null,
            target_credits: targetCredits, 
            category: apiCategory,
            college: searchCollege || null,
            department: searchDept || null,
            grade: searchGrade || null,
            current_courses: state.selectedCourses.map(c => ({ code: c.課程代碼, serial: c.序號 })),
            year: searchYear,
            semester: searchSemester,
            preferred_days: selectedDays 
        };
        
        console.log("傳送 Payload:", payload); // Debug 用

        const data = await api.fetchRecommendations(payload);
        let courses = (data.courses || []).map(c => utils.normalizeCourse ? utils.normalizeCourse(c) : c);
        
        if (['核心通識', '精進中文', '精進英外文', '教育學程', '大二體育', '大三、四體育'].includes(category)) {
            courses = courses.filter(c => {
                const classType = c['開課班別(代表)'] || c.開課班別 || '';
                // 直接檢查開課班別是否包含類別名稱 (字串完全一樣)
                return classType.includes(category);
            });
            
            // 特殊處理：核心通識仍需排除本院 (如果使用者有選學院)
            if (category === '核心通識' && userCollege) {
                courses = courses.filter(c => c.學院 !== userCollege);
            }
        }
        else if (category === '系外選修') {
            // 系外選修維持原樣
            courses = courses.filter(c => {
                const matchCollege = !searchCollege || c.學院 === searchCollege;
                const matchDept = !searchDept || c.科系 === searchDept;
                const matchGrade = !searchGrade || c.年級 === searchGrade;
                return matchCollege && matchDept && matchGrade;
            });
        }

        // 星期過濾 (API 可能已做過，但前端再次確認無妨)
        const dayMap = {'1':'一', '2':'二', '3':'三', '4':'四', '5':'五', '6':'六', '7':'日'};
        courses = courses.filter(course => {
            const cDay = String(course.星期);
            const isMatchNumeric = selectedDays.includes(cDay);
            const isMatchChinese = selectedDays.some(d => dayMap[d] === cDay);
            return isMatchNumeric || isMatchChinese;
        });

        // 衝堂過濾
        if (emptySlotsOnly) {
            courses = courses.filter(course => {
                const check = utils.checkTimeConflict(course);
                return !check.hasConflict; 
            });
        }

        state.recommendedCourses = courses;
        ui.renderRecommendResults(state.recommendedCourses);
        
        if (courses.length > 0) {
             ui.showAlert(`為您找到 ${state.recommendedCourses.length} 門推薦課程`, 'success');
        } else {
             ui.showAlert('沒有找到符合條件的課程，請嘗試放寬條件', 'warning');
        }

    } catch (error) {
        console.error(error);
        ui.showAlert(error.message || '推薦失敗，請稍後再試', 'danger');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-search me-2"></i> 開始推薦';
    }
}

async function handleSearchHistory() {
    const query = document.getElementById('search-history-input').value.trim();
    if (!query) {
        ui.showAlert('請輸入搜尋關鍵字', 'warning');
        return;
    }
    const btn = document.getElementById('btn-search-history');
    const input = document.getElementById('search-history-input');
    
    btn.disabled = true;
    input.disabled = true;
    const originalBtnContent = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>搜尋中...';
    
    try {
        const data = await api.fetchHistory(query);
        displayHistoryResults(data.courses || [], query);
    } catch (error) {
        console.error(error);
        ui.showAlert('搜尋失敗，請稍後再試', 'danger');
    } finally {
        btn.disabled = false;
        input.disabled = false;
        btn.innerHTML = originalBtnContent;
    }
}

// 開啟詳情 Modal
function openHistoryModal(index) {
    const group = historyGroupsCache[index];
    if (!group) return;

    // 1. 設定標題
    document.getElementById('historyDetailTitle').textContent = group.name;
    document.getElementById('historyDetailSubtitle').textContent = `授課教師：${group.teacher} | ${group.dept}`;

    // 2. 準備數據 (圖表用：舊 -> 新)
    const sortedForChart = [...group.data].sort((a, b) => {
        if (a.學年度 !== b.學年度) return a.學年度 - b.學年度;
        return a.學期 - b.學期;
    });

    // 3. 繪製圖表
    renderHistoryChart(sortedForChart);

    // 4. 生成歷年列表 (列表用：新 -> 舊)
    const sortedForList = [...group.data].sort((a, b) => {
        if (b.學年度 !== a.學年度) return b.學年度 - a.學年度;
        return b.學期 - a.學期;
    });

    const tbody = document.getElementById('historyDetailTableBody');
    tbody.innerHTML = sortedForList.map(c => {
        const enrolled = c.選上人數 || 0;
        const capacity = c.上限人數 || 0;
        const rate = capacity > 0 ? Math.round((enrolled / capacity) * 100) : 0;
        
        // 大綱連結處理
        const syllabusUrl = c.教學大綱連結 || c['教學大綱連結'];
        const syllabusBtn = (syllabusUrl && syllabusUrl.includes('http'))
            ? `<a href="${syllabusUrl}" target="_blank" class="btn btn-sm btn-outline-secondary">
                 <i class="fas fa-external-link-alt"></i> 大綱
               </a>`
            : `<span class="text-muted small">無</span>`;

        // 滿人標記
        const statusBadge = rate >= 100 
            ? `<span class="badge bg-danger rounded-pill">${enrolled}/${capacity}</span>`
            : `<span class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 rounded-pill">${enrolled}/${capacity}</span>`;

        return `
            <tr>
                <td class="ps-3"><span class="fw-bold">${c.學年度}</span>-${c.學期}</td>
                <td>${c['開課班別(代表)'] || c.開課班別 || '-'}</td>
                <td class="small text-muted">
                    <div>週${c.星期 || '?'} ${c.起始節次 || ''}-${c.結束節次 || ''}節</div>
                    <div>${c.上課地點 || ''}</div>
                </td>
                <td class="text-center">${statusBadge}</td>
                <td class="text-end pe-3">${syllabusBtn}</td>
            </tr>
        `;
    }).join('');

    // 顯示 Modal
    const modal = new bootstrap.Modal(document.getElementById('historyDetailModal'));
    modal.show();
}

// 繪製/更新圖表
function renderHistoryChart(data) {
    const ctx = document.getElementById('historyDetailChart').getContext('2d');
    
    // 如果已有舊圖表，先銷毀
    if (historyChartInstance) {
        historyChartInstance.destroy();
    }

    const labels = data.map(d => `${d.學年度}-${d.學期}`);
    const enrolledData = data.map(d => d.選上人數 || 0);
    const capacityData = data.map(d => d.上限人數 || 0);

    historyChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '選上人數',
                    data: enrolledData,
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#0d6efd',
                    pointRadius: 4,
                    pointHoverRadius: 6
                },
                {
                    label: '人數上限',
                    data: capacityData,
                    borderColor: '#dc3545',
                    borderDash: [5, 5],
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    titleColor: '#000',
                    bodyColor: '#666',
                    borderColor: '#ddd',
                    borderWidth: 1
                }
            },
            scales: {
                y: { beginAtZero: true, grid: { borderDash: [2, 2] } },
                x: { grid: { display: false } }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

function displayHistoryResults(courses, query) {
    const container = document.getElementById('history-results-container');
    const title = document.getElementById('history-search-title');
    const count = document.getElementById('history-result-count');

    // 更新標題與計數
    if (title) title.textContent = `搜尋結果："${query}"`;
    if (count) count.textContent = `共 ${courses.length} 筆開課紀錄`;

    if (!courses || courses.length === 0) {
        if (container) container.innerHTML = '<div class="col-12 text-center text-muted py-5">沒有找到相關資料</div>';
        return;
    }

    // 1. 資料分組 (依照 課程名稱 + 教師姓名)
    const groups = {};
    courses.forEach(c => {
        const name = c.課程名稱 || c.中文課程名稱;
        const teacher = c.教師姓名;
        const key = `${name}_${teacher}`; 
        
        if (!groups[key]) {
            groups[key] = {
                name: name,
                teacher: teacher,
                dept: c.科系 || '',
                data: []
            };
        }
        groups[key].data.push(c);
    });

    historyGroupsCache = Object.values(groups);

    // 2. 渲染卡片
    if (container) {
        container.innerHTML = historyGroupsCache.map((group, index) => {
            // --- 計算歷年平均暴課率 (Saturation Rate) ---
            // 公式：Sum(當年登記/當年選上) / 有效年數
            // 條件：登記人數為 0 或 選上人數為 0 (避免無限大) 則不納入平均
            let sumRatio = 0;
            let validCount = 0;

            group.data.forEach(item => {
                const registered = parseFloat(item.登記人數 || 0);
                const selected = parseFloat(item.選上人數 || 0);

                if (registered > 0 && selected > 0) {
                    sumRatio += (registered / selected);
                    validCount++;
                }
            });

            const avgRate = validCount > 0 ? (sumRatio / validCount) : 0;
            const avgRatePercent = (avgRate * 100).toFixed(0);
            
            // 決定樣式：暴課率 >= 100% (登記 > 選上) 顯示紅色，否則綠色
            // 若無有效資料 (validCount === 0)，則不顯示顏色或顯示灰色
            let badgeHtml = '';
            
            if (validCount > 0) {
                const badgeClass = avgRate >= 1 ? 'bg-danger' : 'bg-success';
                const icon = avgRate >= 1 ? '<i class="fas fa-fire me-1"></i>' : '';
                
                badgeHtml = `
                    <span class="badge ${badgeClass} p-2" 
                          title="歷年平均暴課率: ${avgRatePercent}% (採計 ${validCount} 筆資料)\n公式: 平均 (登記/選上)">
                        ${icon}暴課率 ${avgRatePercent}%
                    </span>`;
            } else {
                badgeHtml = `<span class="badge bg-light text-muted border p-2">無暴課率資料</span>`;
            }

            // 找出最近一次開課資料 (用於顯示學期)
            const latest = group.data.sort((a, b) => {
                if (b.學年度 !== a.學年度) return b.學年度 - a.學年度;
                return b.學期 - a.學期;
            })[0];

            return `
                <div class="col-md-6 col-lg-4">
                    <div class="card h-100 shadow-sm border-0 hover-shadow transition-all" 
                         style="cursor: pointer;" 
                         onclick="openHistoryModal(${index})">
                        <div class="card-body d-flex flex-column">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <span class="badge bg-primary bg-opacity-10 text-primary">${group.dept}</span>
                                <span class="badge rounded-pill bg-light text-dark border">${group.data.length} 次開課</span>
                            </div>
                            
                            <h5 class="card-title fw-bold text-dark mb-1 text-truncate" title="${group.name}">
                                ${group.name}
                            </h5>
                            
                            <p class="card-text text-muted small mb-3">
                                <i class="fas fa-chalkboard-teacher me-1"></i> ${group.teacher}
                            </p>
                            
                            <div class="mt-auto pt-3 border-top">
                                <div class="d-flex justify-content-between align-items-center">
                                    ${badgeHtml}
                                    <small class="text-muted">
                                        最近: ${latest.學年度}-${latest.學期} <i class="fas fa-chevron-right ms-1"></i>
                                    </small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
}

// ------------------------------------------
// 暴露給 Window 的函數 (給 HTML onclick 用)
// ------------------------------------------

function exposeGlobalFunctions() {
    window.switchTab = ui.switchTab;
    
    window.toggleSidebar = () => {
        const sidebar = document.querySelector('.sidebar');
        const backdrop = document.getElementById('sidebarBackdrop');
        const toggles = document.querySelectorAll('.sidebar-toggle');
        const isOpen = sidebar.classList.toggle('show');
        if (backdrop) {
            if (isOpen) {
                backdrop.classList.add('show');
                backdrop.setAttribute('aria-hidden', 'false');
            } else {
                backdrop.classList.remove('show');
                backdrop.setAttribute('aria-hidden', 'true');
            }
        }
        toggles.forEach(btn => btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false'));
    };

    // 切換課表檢視 (table | cards | auto) — 若使用者手動選擇會記住偏好
    window.toggleScheduleView = (mode) => {
        const section = document.getElementById('tab-schedule');
        if (!section) return;
        // mode: 'table', 'cards', 'auto'
        section.setAttribute('data-view', mode);

        // persist or clear preference
        if (mode === 'auto') localStorage.removeItem('scheduleViewPref');
        else localStorage.setItem('scheduleViewPref', mode);

        // update active state of small-screen buttons
        const btnTable = document.getElementById('view-table-btn');
        const btnCards = document.getElementById('view-cards-btn');
        if (btnTable && btnCards) {
            if (mode === 'table') {
                btnTable.classList.add('active'); btnTable.setAttribute('aria-pressed','true');
                btnCards.classList.remove('active'); btnCards.setAttribute('aria-pressed','false');
            } else if (mode === 'cards') {
                btnCards.classList.add('active'); btnCards.setAttribute('aria-pressed','true');
                btnTable.classList.remove('active'); btnTable.setAttribute('aria-pressed','false');
            } else {
                btnTable.classList.remove('active'); btnTable.setAttribute('aria-pressed','false');
                btnCards.classList.remove('active'); btnCards.setAttribute('aria-pressed','false');
            }
        }
        // re-render schedule views
        ui.updateScheduleDisplay();
        // 顯示提示告知使用者已切換視圖
        if (mode === 'table') ui.showAlert('已切換為表格檢視', 'info');
        else if (mode === 'cards') ui.showAlert('已切換為卡片檢視', 'info');
    }; 
    
    window.removeCourse = (code, serial) => {
        // 1. 先找出課程名稱，讓提示訊息更友善 (需轉字串比對)
        const sCode = String(code);
        const sSerial = String(serial);
        const course = state.selectedCourses.find(c => 
            String(c.課程代碼) === sCode && 
            String(c.序號) === sSerial
        );
        
        const courseName = course ? (course.課程名稱 || course.中文課程名稱) : '此課程';

        // 2. 彈出確認視窗 (樣式仿照清空課程)
        Swal.fire({
            title: `確定要移除「${courseName}」嗎？`,
            text: "移除後將無法復原，需重新加入",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: '確定移除',
            confirmButtonColor: '#dc3545', // 使用紅色代表刪除動作
            cancelButtonText: '取消',
            cancelButtonColor: '#6c757d',
            reverseButtons: true // 讓確認按鈕在右邊 (視個人喜好，Bootstrap 風格通常取消在左)
        }).then((result) => {
            if (result.isConfirmed) {
                // 3. 使用者點擊確定後才執行移除邏輯
                if (utils.removeCourseFromState(code, serial)) {
                    ui.updateScheduleDisplay();
                    ui.updateSelectedCoursesList();
                    saveToLocalStorage();
                    ui.showAlert('課程已移除', 'info');
                }
            }
        });
    };
    window.showCourseDetail = (course) => ui.showCourseDetailModal(course);
    window.showCourseDetailModal = (index) => { if (state.recommendedCourses[index]) ui.showCourseDetailModal(state.recommendedCourses[index]); };
    window.showSelectedCourseDetail = (code, serial) => {
        const sCode = String(code);
        const sSerial = String(serial);
        const course = state.selectedCourses.find(c => 
            String(c.課程代碼) === sCode && 
            String(c.序號) === sSerial
        );
        if (course) {
            ui.showCourseDetailModal(course);
        }
    };
    window.addRecommendedCourse = (course) => {
        const result = utils.addCourseToState(course);
        if (result === true) {
            ui.updateScheduleDisplay();
            ui.updateSelectedCoursesList();
            saveToLocalStorage();
            
            const rawTotal = state.selectedCourses.reduce((sum, c) => sum + (parseFloat(c.學分) || 0), 0);
            const target = parseFloat(document.getElementById('range-credits').value) || 0;
            
            if (rawTotal > target) {
                 ui.showAlert(`課程已加入，但總學分(${rawTotal})已超過目標(${target})`, 'warning');
            } else {
                 ui.showAlert('課程已加入', 'success');
            }
        } else if (result === 'conflict') {
            ui.showAlert('時間衝突：該時段已有課程', 'warning');
        } else {
            ui.showAlert('該課程已在您的課表中', 'info');
        }
    };
    window.addRecommendedCourseByIndex = (index) => { if (state.recommendedCourses[index]) window.addRecommendedCourse(state.recommendedCourses[index]); };
    window.openHistoryModal = openHistoryModal;
}

// 防抖輔助函數
function debounce(fn, wait = 150) {
    let timer = null;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), wait);
    };
}

// 當處於 auto 模式時，根據視窗寬度動態決定 table / cards 顯示
function detectAndApplyScheduleView() {
    const section = document.getElementById('tab-schedule');
    if (!section) return;
    const pref = localStorage.getItem('scheduleViewPref');
    if (pref === 'table' || pref === 'cards') {
        section.setAttribute('data-view', pref);
    } else {
        if (section.getAttribute('data-view') === 'auto') {
            section.setAttribute('data-view', window.innerWidth < 768 ? 'cards' : 'table');
        }
    }
    ui.updateScheduleDisplay();
}