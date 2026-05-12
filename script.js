const loadBtn = document.getElementById("loadBtn");
const result = document.getElementById("result");
const entryInput = document.getElementById("entryInput");
const entryScreen = document.getElementById("entryScreen");
const appScreen = document.getElementById("appScreen");
const headerTutorName = document.getElementById("headerTutorName");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

const calendarGrid = document.getElementById("calendarGrid");
const calendarTitle = document.getElementById("calendarTitle");
const calendarLoading = document.getElementById("calendarLoading");
const selectedDateBadge = document.getElementById("selectedDateBadge");
const selectedDateText = document.getElementById("selectedDateText");
const weeklyRefreshBtn = document.getElementById("weeklyRefreshBtn");
const weeklyLoading = document.getElementById("weeklyLoading");
const weeklyContent = document.getElementById("weeklyContent");
const navItems = document.querySelectorAll("[data-panel-target]");
const contentPanels = document.querySelectorAll(".content-panel");

const MAIN_SHEET_URL = "";

let currentTutor = "";
let linkMap = {};
let managerMap = {};

let allDates = [];
let selectedDate = "";
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

async function loadLinks() {
  try {
    const response = await fetch("/api/links");
    const data = await response.json();

    if (data.success) {
      linkMap = data.links || {};
      managerMap = data.managerMap || {};
    }
  } catch (error) {
    console.error("링크 불러오기 실패:", error);
  }
}

async function loadDates() {
  try {
    calendarLoading.textContent = "날짜를 불러오는 중...";
    const response = await fetch("/api/dates");
    const data = await response.json();

    if (!data.success) {
      calendarLoading.textContent = "날짜를 불러오지 못했습니다.";
      return;
    }

    allDates = data.dates || [];

    if (allDates.length > 0) {
      const firstDate = new Date(allDates[0].value + "T00:00:00");
      currentYear = firstDate.getFullYear();
      currentMonth = firstDate.getMonth();
    }

    calendarLoading.style.display = "none";
    renderCalendar(currentYear, currentMonth);
  } catch (error) {
    calendarLoading.textContent = "오류가 발생했습니다.";
  }
}

function formatMonthTitle(year, month) {
  return `${year}년 ${month + 1}월`;
}

function getDateMap() {
  const map = {};
  allDates.forEach(item => {
    map[item.value] = item;
  });
  return map;
}

function renderCalendar(year, month) {
  const dateMap = getDateMap();
  calendarGrid.innerHTML = "";

  calendarTitle.textContent = formatMonthTitle(year, month);

  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  weekdays.forEach(day => {
    const el = document.createElement("div");
    el.className = "calendar-weekday";
    el.textContent = day;
    calendarGrid.appendChild(el);
  });

  const firstDay = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDay.getDay();

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  for (let i = 0; i < startWeekday; i++) {
    const blank = document.createElement("div");
    blank.className = "calendar-day empty";
    calendarGrid.appendChild(blank);
  }

  for (let day = 1; day <= lastDate; day++) {
    const d = new Date(year, month, day);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const hasData = !!dateMap[dateKey];

    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "calendar-day";
    cell.textContent = String(day);

    if (dateKey === todayKey) {
      cell.classList.add("today");
    }

    if (hasData) {
      cell.classList.add("has-date");

      if (selectedDate === dateKey) {
        cell.classList.add("selected");
      }

      cell.addEventListener("click", () => {
        selectedDate = dateKey;
        selectedDateText.textContent = dateMap[dateKey].label || dateKey;
        selectedDateBadge.classList.add("visible");
        renderCalendar(currentYear, currentMonth);
      });
    } else {
      cell.disabled = true;
      cell.classList.add("disabled");
    }

    calendarGrid.appendChild(cell);
  }
}

function renderSchedule(data) {
  if (!data.success) {
    result.textContent = data.message || "불러오지 못했습니다.";
    return;
  }

  if (!data.blocks || data.blocks.length === 0) {
    result.innerHTML = `<div class="empty-message">수업 정보가 없습니다.</div>`;
    return;
  }

  let html = `
    <div class="schedule-header">
      <div><strong>날짜:</strong> ${data.date}</div>
      <div><strong>튜터:</strong> ${data.tutor}</div>
    </div>
  `;

  data.blocks.forEach(block => {
    const bk = block.block || "F";

    html += `
      <div class="block-section section-${bk}">
        <div class="block-header">
          <div class="block-badge badge-${bk}">${bk}</div>
          <span class="block-title">${bk}콤마</span>
          <span class="arrival-chip">출근 ${block.arrival || "-"}</span>
        </div>
    `;

    if (!block.students || block.students.length === 0) {
      html += `<div class="empty-message">이 블록에 학생이 없어요.</div>`;
    } else {
      block.students.forEach((student, idx) => {
        const rawSeat = student.seat || String(idx + 1);
        const seatMatch = rawSeat.match(/^(.+?)\s+(\d+)번$/);
        const seatNum = seatMatch ? seatMatch[2] : (rawSeat.replace(/[^\d]/g, "") || String(idx + 1));
        const seatRoom = seatMatch ? seatMatch[1].trim() : "";

        const keyCandidates = [
          `${student.name} ${student.subject} ${student.clipboard}`,
          `${student.name} ${student.subject}`,
          `${student.name}`
        ];

        const matchedKey =
          keyCandidates.find(key => linkMap[key]) ||
          Object.keys(linkMap).find(key =>
            key.includes(student.name) &&
            key.includes(student.subject || "")
          ) ||
          "";

        const studentUrl = matchedKey ? (linkMap[matchedKey] || "") : "";
        const managerName = matchedKey ? (managerMap[matchedKey] || "") : "";

        html += `
          <div class="student-card">
            <div class="seat-bar seat-bar-${bk}"></div>
            <div class="seat-section">
              <span class="seat-num">${seatNum}</span>
              ${seatRoom ? `<span class="seat-room">${seatRoom}</span>` : ""}
            </div>
            <div class="card-inner">
              <div class="student-name">${student.name}</div>
              <div class="student-tags">
                ${student.subject ? `<span class="st-tag tag-subject">${student.subject}</span>` : ""}
                ${student.seat ? `<span class="st-tag tag-seat">${student.seat}</span>` : ""}
                ${student.clipboard ? `<span class="st-tag tag-num">📋 ${student.clipboard}</span>` : ""}
                ${managerName ? `<span class="st-tag tag-manager">👤 ${managerName}</span>` : ""}
              </div>
              <div class="student-actions">
                ${
                  studentUrl
                    ? `<a class="link-btn" href="${studentUrl}" target="_blank" rel="noopener noreferrer">통합자료 열기</a>`
                    : `
                      <div class="no-link-wrap">
                        <span class="no-link-msg">개별 링크 없음</span>
                        <a class="link-btn main-sheet-btn" href="${escapeHtml(MAIN_SHEET_URL || "#")}" target="_blank" rel="noopener noreferrer">메인시트에서 찾기</a>
                      </div>
                    `
                }
              </div>
            </div>
          </div>
        `;
      });
    }

    html += `</div>`;
  });

  result.innerHTML = html;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeWeeklyBlocks(blocks) {
  if (Array.isArray(blocks)) {
    return blocks;
  }

  if (blocks && typeof blocks === "object") {
    return Object.keys(blocks).sort().map(key => ({
      block: key,
      ...(blocks[key] || {})
    }));
  }

  return [];
}

function renderWeeklySchedule(data) {
  if (!weeklyContent || !weeklyLoading) return;

  weeklyLoading.style.display = "none";

  if (!data.success && data.message) {
    weeklyContent.innerHTML = `<div class="empty-message">${escapeHtml(data.message)}</div>`;
    return;
  }

  const days = Array.isArray(data) ? data : (data.days || data.weekly || []);

  if (!days.length) {
    weeklyContent.innerHTML = `<div class="empty-message">이번 주 스케줄이 없습니다.</div>`;
    return;
  }

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const firstLabel = days[0].label || days[0].date || days[0].dateKey || "";
  const lastLabel = days[days.length - 1].label || days[days.length - 1].date || days[days.length - 1].dateKey || "";

  let html = `
    <div class="week-summary">
      ${escapeHtml(currentTutor)} 튜터님 · ${escapeHtml(firstLabel)}${firstLabel !== lastLabel ? ` ~ ${escapeHtml(lastLabel)}` : ""} · ${days.length}일
    </div>
  `;

  days.forEach(day => {
    const dateKey = day.dateKey || day.date || "";
    const label = day.label || dateKey;
    const blocks = normalizeWeeklyBlocks(day.blocks);

    html += `
      <section class="week-day-card ${dateKey === todayKey ? "today-card" : ""}">
        <div class="week-day-head">
          <div class="week-day-date">${escapeHtml(label)}</div>
          ${day.arrival ? `<span class="week-day-chip">출근 ${escapeHtml(day.arrival)}</span>` : ""}
        </div>
        <div class="week-blocks">
          ${
            blocks.length
              ? blocks.map(block => {
                  const bk = block.block || "F";
                  const count = Array.isArray(block.students) ? block.students.length : 0;
                  return `
                    <div class="week-block-chip">
                      <span class="week-block-badge badge-${escapeHtml(bk)}">${escapeHtml(bk)}</span>
                      <span>${escapeHtml(bk)}콤마${count ? ` · ${count}명` : ""}</span>
                    </div>
                  `;
                }).join("")
              : `<div class="empty-message">등록된 블록이 없습니다.</div>`
          }
        </div>
      </section>
    `;
  });

  weeklyContent.innerHTML = html;
}

async function loadWeeklySchedule() {
  if (!weeklyContent || !weeklyLoading || !currentTutor) return;

  weeklyLoading.style.display = "block";
  weeklyLoading.textContent = "이번 주 스케줄을 불러오는 중...";
  weeklyContent.innerHTML = "";

  try {
    const response = await fetch(`/api/weekly?tutor=${encodeURIComponent(currentTutor)}`);
    const data = await response.json();
    renderWeeklySchedule(data);
  } catch (error) {
    weeklyLoading.style.display = "none";
    weeklyContent.innerHTML = `<div class="empty-message">이번 주 스케줄을 불러오지 못했습니다: ${escapeHtml(error.message)}</div>`;
  }
}

function showPanel(panelId) {
  contentPanels.forEach(panel => {
    panel.classList.toggle("active", panel.id === panelId);
  });

  navItems.forEach(item => {
    item.classList.toggle("active", item.dataset.panelTarget === panelId);
  });
}

async function fetchSchedule() {
  if (!selectedDate) {
    result.textContent = "날짜를 먼저 선택해 주세요.";
    return;
  }

  if (!currentTutor) {
    result.textContent = "튜터 정보가 없습니다. 다시 로그인해 주세요.";
    return;
  }

  const dateInfo = allDates.find(item => item.value === selectedDate);
  const gid = dateInfo?.gid || "";

  result.textContent = `${selectedDate} / ${currentTutor} 수업 정보를 불러오는 중...`;

  try {
    let url = `/api/schedule?date=${encodeURIComponent(selectedDate)}&tutor=${encodeURIComponent(currentTutor)}`;
    if (gid) {
      url += `&gid=${encodeURIComponent(gid)}`;
    }

    const response = await fetch(url);
    const data = await response.json();
    renderSchedule(data);
  } catch (error) {
    result.textContent = "오류가 발생했습니다: " + error.message;
  }
}

async function initApp() {
  await loadLinks();
  await loadDates();
  result.innerHTML = `<div class="empty-message">날짜를 선택하고 조회해 주세요.</div>`;
  loadWeeklySchedule();
}

function doLogin() {
  const name = entryInput.value.trim();

  if (!name) {
    entryInput.focus();
    return;
  }

  currentTutor = name;
  localStorage.setItem("savedTutor", name);

  if (headerTutorName) {
    headerTutorName.textContent = `${name} 튜터님`;
  }

  entryScreen.style.display = "none";
  appScreen.style.display = "block";

  initApp();
}

function doLogout() {
  currentTutor = "";
  selectedDate = "";
  localStorage.removeItem("savedTutor");

  if (entryInput) entryInput.value = "";
  if (selectedDateBadge) selectedDateBadge.classList.remove("visible");
  if (result) result.innerHTML = `<div class="empty-message">아직 조회된 내용이 없습니다.</div>`;

  appScreen.style.display = "none";
  entryScreen.style.display = "flex";
}

function tryAutoLogin() {
  const savedTutor = localStorage.getItem("savedTutor");

  if (savedTutor) {
    currentTutor = savedTutor;
    if (entryInput) entryInput.value = savedTutor;
    if (headerTutorName) {
      headerTutorName.textContent = `${savedTutor} 튜터님`;
    }

    entryScreen.style.display = "none";
    appScreen.style.display = "block";
    initApp();
  } else {
    entryScreen.style.display = "flex";
    appScreen.style.display = "none";
  }
}

document.getElementById("prevMonthBtn")?.addEventListener("click", () => {
  currentMonth -= 1;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear -= 1;
  }
  renderCalendar(currentYear, currentMonth);
});

document.getElementById("nextMonthBtn")?.addEventListener("click", () => {
  currentMonth += 1;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear += 1;
  }
  renderCalendar(currentYear, currentMonth);
});

if (loginBtn) {
  loginBtn.addEventListener("click", doLogin);
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", doLogout);
}

if (entryInput) {
  entryInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      doLogin();
    }
  });
}

if (loadBtn) {
  loadBtn.addEventListener("click", fetchSchedule);
}

if (weeklyRefreshBtn) {
  weeklyRefreshBtn.addEventListener("click", loadWeeklySchedule);
}

navItems.forEach(item => {
  item.addEventListener("click", (event) => {
    event.preventDefault();
    showPanel(item.dataset.panelTarget);
  });
});

showPanel("dateLookupPanel");

tryAutoLogin();
