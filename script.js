const loadBtn = document.getElementById("loadBtn");
const result = document.getElementById("result");
const dateSelect = document.getElementById("dateSelect");
const entryInput = document.getElementById("entryInput");
const entryScreen = document.getElementById("entryScreen");
const appScreen = document.getElementById("appScreen");
const headerTutorName = document.getElementById("headerTutorName");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

let currentTutor = "";
let linkMap = {};
let managerMap = {};

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
    const response = await fetch("/api/dates");
    const data = await response.json();

    if (!data.success) {
      if (dateSelect) {
        dateSelect.innerHTML = '<option value="">날짜를 불러오지 못했습니다.</option>';
      }
      return;
    }

    if (dateSelect) {
      dateSelect.innerHTML = '<option value="">날짜를 선택하세요</option>';

      data.dates.forEach(item => {
        const option = document.createElement("option");
        option.value = item.value;
        option.textContent = item.label;
        option.dataset.gid = item.gid || "";
        dateSelect.appendChild(option);
      });
    }
  } catch (error) {
    if (dateSelect) {
      dateSelect.innerHTML = '<option value="">오류가 발생했습니다.</option>';
    }
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

async function fetchSchedule() {
  const selectedDate = dateSelect ? dateSelect.value : "";
  const selectedOption = dateSelect ? dateSelect.options[dateSelect.selectedIndex] : null;
  const gid = selectedOption?.dataset?.gid || "";

  if (!selectedDate) {
    result.textContent = "날짜를 먼저 선택해 주세요.";
    return;
  }

  if (!currentTutor) {
    result.textContent = "튜터 정보가 없습니다. 다시 로그인해 주세요.";
    return;
  }

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
  localStorage.removeItem("savedTutor");

  if (entryInput) entryInput.value = "";
  if (dateSelect) dateSelect.selectedIndex = 0;
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

tryAutoLogin();