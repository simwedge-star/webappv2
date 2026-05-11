const loadBtn = document.getElementById("loadBtn");
const result = document.getElementById("result");
const tutorSelect = document.getElementById("tutorSelect");
const entryScreen = document.getElementById("entryScreen");
const appScreen = document.getElementById("appScreen");
const entryInput = document.getElementById("entryInput");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const headerTutorName = document.getElementById("headerTutorName");
const calendarTitle = document.getElementById("calendarTitle");
const calendarGrid = document.getElementById("calendarGrid");
const calendarLoading = document.getElementById("calendarLoading");
const selectedDateBadge = document.getElementById("selectedDateBadge");
const selectedDateText = document.getElementById("selectedDateText");
const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");

let linkMap = {};
let managerMap = {};
let currentTutor = "";
let appLoaded = false;
let availableDateMap = {};
let selectedDate = "";
let selectedGid = "";
let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth();

function startApp() {
  if (appLoaded) return;

  appLoaded = true;
  loadLinks();
  loadDates();
}

function doLogin() {
  const name = entryInput.value.trim();

  if (!name) {
    entryInput.focus();
    return;
  }

  currentTutor = name;
  headerTutorName.textContent = `${name} 튜터님`;

  try {
    localStorage.setItem("savedTutor", name);
  } catch (error) {
    console.error("이름 저장 실패:", error);
  }

  entryScreen.style.display = "none";
  appScreen.style.display = "flex";
  startApp();
}

function doLogout() {
  currentTutor = "";
  appLoaded = false;
  linkMap = {};
  managerMap = {};
  availableDateMap = {};
  selectedDate = "";
  selectedGid = "";

  try {
    localStorage.removeItem("savedTutor");
  } catch (error) {
    console.error("저장된 이름 삭제 실패:", error);
  }

  entryInput.value = "";
  headerTutorName.textContent = "튜터님";
  calendarTitle.textContent = "날짜 불러오는 중";
  calendarGrid.innerHTML = "";
  calendarLoading.style.display = "block";
  calendarLoading.textContent = "날짜를 불러오는 중...";
  selectedDateBadge.classList.remove("visible");
  selectedDateText.textContent = "";
  tutorSelect.innerHTML = '<option value="">날짜를 먼저 선택하세요</option>';
  result.textContent = "아직 불러온 내용이 없습니다.";

  appScreen.style.display = "none";
  entryScreen.style.display = "flex";
  entryInput.focus();
}

function tryAutoLogin() {
  try {
    const savedTutor = localStorage.getItem("savedTutor");

    if (savedTutor) {
      entryInput.value = savedTutor;
      doLogin();
    } else {
      entryInput.focus();
    }
  } catch (error) {
    console.error("자동 로그인 실패:", error);
  }
}

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

function normalizeDateItem(item) {
  const value = item.value || item.dateKey || item.date || "";

  return {
    value,
    label: item.label || value,
    gid: item.gid || ""
  };
}

async function loadDates() {
  calendarLoading.style.display = "block";
  calendarLoading.textContent = "날짜를 불러오는 중...";

  try {
    const response = await fetch("/api/dates");
    const data = await response.json();

    if (data.success === false) {
      calendarLoading.textContent = "날짜를 불러오지 못했습니다.";
      return;
    }

    availableDateMap = {};

    (data.dates || []).map(normalizeDateItem).forEach(item => {
      if (!item.value) return;
      availableDateMap[item.value] = {
        label: item.label,
        gid: item.gid
      };
    });

    const firstDate = Object.keys(availableDateMap).sort()[0];
    if (firstDate) {
      const first = new Date(`${firstDate}T00:00:00`);
      calendarYear = first.getFullYear();
      calendarMonth = first.getMonth();
    }

    calendarLoading.style.display = Object.keys(availableDateMap).length ? "none" : "block";
    if (!Object.keys(availableDateMap).length) {
      calendarLoading.textContent = "선택 가능한 날짜가 없습니다.";
    }

    renderCalendar();
  } catch (error) {
    calendarLoading.textContent = "오류가 발생했습니다.";
  }
}

function renderCalendar() {
  const monthNames = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const today = new Date().toISOString().slice(0, 10);
  const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();

  calendarTitle.textContent = `${calendarYear}년 ${monthNames[calendarMonth]}`;
  calendarGrid.innerHTML = "";

  weekdays.forEach(day => {
    const weekday = document.createElement("div");
    weekday.className = "calendar-weekday";
    weekday.textContent = day;
    calendarGrid.appendChild(weekday);
  });

  for (let i = 0; i < firstDay; i += 1) {
    const empty = document.createElement("div");
    empty.className = "calendar-day";
    calendarGrid.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const month = calendarMonth + 1;
    const dateKey = `${calendarYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dateInfo = availableDateMap[dateKey];
    const cell = document.createElement("button");

    cell.type = "button";
    cell.className = "calendar-day";
    cell.innerHTML = `<span>${day}</span>`;

    if (dateKey === today) {
      cell.classList.add("today");
    }

    if (dateInfo) {
      cell.classList.add("has-date");
      cell.setAttribute("aria-label", `${dateInfo.label} 선택`);

      const dot = document.createElement("span");
      dot.className = "calendar-dot";
      cell.appendChild(dot);

      if (dateKey === selectedDate) {
        cell.classList.add("selected");
      }

      cell.addEventListener("click", () => selectDate(dateKey));
    } else {
      cell.disabled = true;
      cell.setAttribute("aria-label", `${dateKey} 수업 없음`);
    }

    calendarGrid.appendChild(cell);
  }
}

function changeMonth(direction) {
  calendarMonth += direction;

  if (calendarMonth < 0) {
    calendarMonth = 11;
    calendarYear -= 1;
  }

  if (calendarMonth > 11) {
    calendarMonth = 0;
    calendarYear += 1;
  }

  renderCalendar();
}

function selectDate(dateKey) {
  const dateInfo = availableDateMap[dateKey];
  if (!dateInfo) return;

  selectedDate = dateKey;
  selectedGid = dateInfo.gid || "";
  selectedDateText.textContent = dateInfo.label || dateKey;
  selectedDateBadge.classList.add("visible");
  result.textContent = "아직 불러온 내용이 없습니다.";

  renderCalendar();
  loadTutors(selectedDate);
}

async function loadTutors(dateKey) {
  tutorSelect.innerHTML = '<option value="">튜터를 불러오는 중...</option>';

  if (!dateKey) {
    tutorSelect.innerHTML = '<option value="">날짜를 먼저 선택하세요</option>';
    return;
  }

  try {
    const response = await fetch(`/api/tutors?date=${encodeURIComponent(dateKey)}`);
    const data = await response.json();

    if (data.success === false) {
      tutorSelect.innerHTML = '<option value="">튜터를 불러오지 못했습니다.</option>';
      return;
    }

    tutorSelect.innerHTML = '<option value="">튜터를 선택하세요</option>';

    (data.tutors || []).forEach(name => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      tutorSelect.appendChild(option);
    });

    if (currentTutor) {
      const hasCurrentTutor = Array.from(tutorSelect.options).some(option => option.value === currentTutor);
      if (hasCurrentTutor) {
        tutorSelect.value = currentTutor;
      }
    }
  } catch (error) {
    tutorSelect.innerHTML = '<option value="">오류가 발생했습니다.</option>';
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
                    : `<span class="no-link-msg">링크 없음</span>`
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

loginBtn.addEventListener("click", doLogin);

entryInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    doLogin();
  }
});

logoutBtn.addEventListener("click", doLogout);
prevMonthBtn.addEventListener("click", () => changeMonth(-1));
nextMonthBtn.addEventListener("click", () => changeMonth(1));

loadBtn.addEventListener("click", async () => {
  const tutorName = tutorSelect.value;

  if (!selectedDate) {
    result.textContent = "날짜를 먼저 선택해 주세요.";
    return;
  }

  if (!tutorName) {
    result.textContent = "튜터를 먼저 선택해 주세요.";
    return;
  }

  result.textContent = `${selectedDate} / ${tutorName} 수업 정보를 불러오는 중...`;

  try {
    let url = `/api/schedule?date=${encodeURIComponent(selectedDate)}&tutor=${encodeURIComponent(tutorName)}`;
    if (selectedGid) {
      url += `&gid=${encodeURIComponent(selectedGid)}`;
    }

    const response = await fetch(url);
    const data = await response.json();
    renderSchedule(data);
  } catch (error) {
    result.textContent = "오류가 발생했습니다: " + error.message;
  }
});

tryAutoLogin();
