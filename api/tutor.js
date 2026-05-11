export default async function handler(req, res) {
  try {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "이름이 없습니다."
      });
    }

    const GAS_URL = "https://script.google.com/macros/s/AKfycbxTDDAy-W6DnCJ0f73n8sx3xbTAH-9YZWD2AGsl6uhbsVa60t9VQSvbycuh7viyaqBQ/exec";
    const url = `${GAS_URL}?name=${encodeURIComponent(name)}`;

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