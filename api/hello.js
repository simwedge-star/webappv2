export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    message: "중간 직원이 잘 작동하고 있어요!"
  });
}