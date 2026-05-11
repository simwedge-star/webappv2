export default function handler(req, res) {
  const { date } = req.query;

  const tutorMap = {
    "2026-05-01": ["심예지", "김민수"],
    "2026-05-02": ["박지은", "최현우"],
    "2026-05-03": ["심예지", "이도윤"]
  };

  res.status(200).json({
    success: true,
    tutors: tutorMap[date] || []
  });
}