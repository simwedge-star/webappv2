import { requireGasUrl } from "../config.js";

export default async function handler(req, res) {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "date가 없습니다."
      });
    }

    const gasUrl = requireGasUrl();
    const url = `${gasUrl}?mode=tutors&date=${encodeURIComponent(date)}`;

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
