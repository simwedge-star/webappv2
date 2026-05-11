export default async function handler(req, res) {
  try {
    const { date, tutor, gid } = req.query;

    if (!date || !tutor) {
      return res.status(400).json({
        success: false,
        message: "date와 tutor가 필요합니다."
      });
    }

    const GAS_URL = "https://script.google.com/macros/s/AKfycbwIvGwTjWEYXPtHrdwEjU4tYoOY_YKK2O-0WYUj1Kc9C4oW0AuEZI20tKEWS_ouz-g/exec";

    let url = `${GAS_URL}?mode=schedule&date=${encodeURIComponent(date)}&tutor=${encodeURIComponent(tutor)}`;

    if (gid) {
      url += `&gid=${encodeURIComponent(gid)}`;
    }

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