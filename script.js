const loadBtn = document.getElementById("loadBtn");
const result = document.getElementById("result");
const dateSelect = document.getElementById("dateSelect");
const tutorSelect = document.getElementById("tutorSelect");

async function loadDates() {
  try {
    const response = await fetch("/api/dates");
    const data = await response.json();

    if (!data.success) {
      dateSelect.innerHTML = '<option value="">날짜를 불러오지 못했습니다.</option>';
      return;
    }

    dateSelect.innerHTML = '<option value="">날짜를 선택하세요</option>';

    data.dates.forEach(item => {
      const option = document.createElement("option");
      option.value = item.value;
      option.textContent = item.label;
      option.dataset.gid = item.gid || "";
      dateSelect.appendChild(option);
    });
  } catch (error) {
    dateSelect.innerHTML = '<option value="">오류가 발생했습니다.</option>';
  }
}

async function loadTutors(selectedDate) {
  tutorSelect.innerHTML = '<option value="">튜터를 불러오는 중...</option>';

  if (!selectedDate) {
    tutorSelect.innerHTML = '<option value="">날짜를 먼저 선택하세요</option>';
    return;
  }

  try {
    const response = await fetch(`/api/tutors?date=${encodeURIComponent(selectedDate)}`);
    const data = await response.json();

    if (!data.success) {
      tutorSelect.innerHTML = '<option value="">튜터를 불러오지 못했습니다.</option>';
      return;
    }

    tutorSelect.innerHTML = '<option value="">튜터를 선택하세요</option>';

    data.tutors.forEach(name => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      tutorSelect.appendChild(option);
    });
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
    html += `
      <div class="block-card">
        <div class="block-title">${block.block}콤마</div>
        <div class="block-arrival">출근: ${block.arrival || "-"}</div>
    `;

    if (!block.students || block.students.length === 0) {
      html += `<div class="empty-message">학생 없음</div>`;
    } else {
      block.students.forEach(student => {
        html += `
          <div class="student-card">
            <div><strong>이름:</strong> ${student.name}</div>
            <div><strong>과목:</strong> ${student.subject}</div>
            <div><strong>좌석:</strong> ${student.seat}</div>
            <div><strong>번호:</strong> ${student.clipboard}</div>
          </div>
        `;
      });
    }

    html += `</div>`;
  });

  result.innerHTML = html;
}

dateSelect.addEventListener("change", () => {
  loadTutors(dateSelect.value);
});

loadBtn.addEventListener("click", async () => {
  const selectedDate = dateSelect.value;
  const tutorName = tutorSelect.value;
  const selectedOption = dateSelect.options[dateSelect.selectedIndex];
  const gid = selectedOption?.dataset?.gid || "";

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
    if (gid) {
      url += `&gid=${encodeURIComponent(gid)}`;
    }

    const response = await fetch(url);
    const data = await response.json();
    renderSchedule(data);
  } catch (error) {
    result.textContent = "오류가 발생했습니다: " + error.message;
  }
});

loadDates();