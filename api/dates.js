export default async function handler(req, res) {
  try {
    const GAS_URL = "https://script.google.com/macros/s/AKfycbwl0LL3N5Zs9yoV9HEtxdmRuHiChc4_suiK4YKTX5yNxxAV7979Wis6EwJPNSV2cgQk/exec";
    const url = `${GAS_URL}?mode=dates`;

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