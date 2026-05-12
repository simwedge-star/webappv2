import { requireGasUrl } from "./env.js";

export default async function handler(req, res) {
  try {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "이름이 없습니다."
      });
    }

    const gasUrl = requireGasUrl();
    const url = `${gasUrl}?name=${encodeURIComponent(name)}`;

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
