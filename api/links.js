import { requireGasUrl } from "./env.js";

export default async function handler(req, res) {
  try {
    const gasUrl = requireGasUrl();
    const url = `${gasUrl}?mode=links`;

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
