export default async function handler(req, res) {
  try {
    const { tutor } = req.query;

    if (!tutor) {
      return res.status(400).json({
        success: false,
        message: "tutor가 없습니다."
      });
    }

    const GAS_URL = "https://script.google.com/macros/s/AKfycbwIvGwTjWEYXPtHrdwEjU4tYoOY_YKK2O-0WYUj1Kc9C4oW0AuEZI20tKEWS_ouz-g/exec";
    const url = `${GAS_URL}?mode=weekly&tutor=${encodeURIComponent(tutor)}`;

    const response = await fetch(url);
    const data = await response.json();

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}