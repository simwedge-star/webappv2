const GAS_URL = "https://script.google.com/macros/s/AKfycbxTDDAy-W6DnCJ0f73n8sx3xbTAH-9YZWD2AGsl6uhbsVa60t9VQSvbycuh7viyaqBQ/exec";

const loadBtn = document.getElementById("loadBtn");
const tutorNameInput = document.getElementById("tutorName");
const result = document.getElementById("result");
const dateSelect = document.getElementById("dateSelect");

async function loadDates() {
  try {
    const response = await fetch(`${GAS_URL}?mode=dates`);
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

loadBtn.addEventListener("click", async () => {
  const tutorName = tutorNameInput.value.trim();
  const selectedDate = dateSelect.value;

  if (!selectedDate) {
    result.textContent = "날짜를 먼저 선택해 주세요.";
    return;
  }

  if (!tutorName) {
    result.textContent = "튜터 이름을 입력해 주세요.";
    return;
  }

  result.textContent = `${selectedDate} / ${tutorName} 불러오는 중...`;

  try {
    const url = `${GAS_URL}?name=${encodeURIComponent(tutorName)}`;
    const response = await fetch(url);
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