import { requireGasUrl } from "./env.js";

export default async function handler(req, res) {
  try {
    const { date, tutor, gid } = req.query;

    if (!date || !tutor) {
      return res.status(400).json({
        success: false,
        message: "date와 tutor가 필요합니다."
      });
    }

    const gasUrl = requireGasUrl();

    let url = `${gasUrl}?mode=schedule&date=${encodeURIComponent(date)}&tutor=${encodeURIComponent(tutor)}`;

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
