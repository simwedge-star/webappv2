export default function handler(req, res) {
  res.status(200).json({
    success: true,
    dates: [
      { value: "2026-05-01", label: "2026-05-01" },
      { value: "2026-05-02", label: "2026-05-02" },
      { value: "2026-05-03", label: "2026-05-03" }
    ]
  });
}