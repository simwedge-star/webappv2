const GAS_URL = "https://script.google.com/macros/s/AKfycbxTDDAy-W6DnCJ0f73n8sx3xbTAH-9YZWD2AGsl6uhbsVa60t9VQSvbycuh7viyaqBQ/exec";

const loadBtn = document.getElementById("loadBtn");
const tutorNameInput = document.getElementById("tutorName");
const result = document.getElementById("result");

loadBtn.addEventListener("click", async () => {
  const tutorName = tutorNameInput.value.trim();

  if (!tutorName) {
    result.textContent = "튜터 이름을 입력해 주세요.";
    return;
  }

  result.textContent = "불러오는 중...";

  try {
    const url = `${GAS_URL}?name=${encodeURIComponent(tutorName)}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.success) {
      result.textContent = data.message;
    } else {
      result.textContent = data.message;
    }
  } catch (error) {
    result.textContent = "오류가 발생했습니다: " + error.message;
  }
});