const loadBtn = document.getElementById("loadBtn");
const result = document.getElementById("result");
const dateSelect = document.getElementById("dateSelect");
const tutorSelect = document.getElementById("tutorSelect");

async function loadDates() {
  try {
    const response = await fetch(`/api/dates`);
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

dateSelect.addEventListener("change", () => {
  loadTutors(dateSelect.value);
});

loadBtn.addEventListener("click", async () => {
  const selectedDate = dateSelect.value;
  const tutorName = tutorSelect.value;

  if (!selectedDate) {
    result.textContent = "날짜를 먼저 선택해 주세요.";
    return;
  }

  if (!tutorName) {
    result.textContent = "튜터를 먼저 선택해 주세요.";
    return;
  }

  result.textContent = `${selectedDate} / ${tutorName} 불러오는 중...`;

  try {
    const response = await fetch(`/api/tutor?name=${encodeURIComponent(tutorName)}`);
    const data = await response.json();

    if (data.success) {
      result.textContent = `[${selectedDate}] ${data.message}`;
    } else {
      result.textContent = data.message;
    }
  } catch (error) {
    result.textContent = "오류가 발생했습니다: " + error.message;
  }
});

loadDates();