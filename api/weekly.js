import fs from "node:fs";
import path from "node:path";

function readLocalEnvValue(key) {
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    const envText = fs.readFileSync(envPath, "utf8");
    const line = envText
      .split(/\r?\n/)
      .find(item => item.trim().startsWith(`${key}=`));

    return line ? line.slice(key.length + 1).trim() : "";
  } catch (error) {
    return "";
  }
}

function getEnvValue(key) {
  return process.env[key] || readLocalEnvValue(key);
}

function getKoreaDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short"
  }).formatToParts(date);

  const byType = Object.fromEntries(parts.map(part => [part.type, part.value]));

  return {
    year: Number(byType.year),
    month: Number(byType.month),
    day: Number(byType.day),
    weekday: byType.weekday
  };
}

function getCurrentWeekRange() {
  const today = getKoreaDateParts();
  const date = new Date(Date.UTC(today.year, today.month - 1, today.day));
  const day = date.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() + mondayOffset);

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  return {
    start: formatDateKey(monday),
    end: formatDateKey(sunday)
  };
}

function formatDateKey(date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0")
  ].join("-");
}

function parseBlocks(value) {
  return String(value || "")
    .split(",")
    .map(block => block.trim())
    .filter(Boolean)
    .map(block => ({ block }));
}

export default async function handler(req, res) {
  try {
    const { tutor } = req.query;

    if (!tutor) {
      return res.status(400).json({
        success: false,
        message: "tutor가 없습니다."
      });
    }

    const supabaseUrl = getEnvValue("SUPABASE_URL");
    const supabaseKey = getEnvValue("SUPABASE_SERVICE_ROLE_KEY") || getEnvValue("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        success: false,
        message: "Supabase 환경변수가 설정되지 않았습니다."
      });
    }

    const { start, end } = getCurrentWeekRange();
    const url = new URL("/rest/v1/weekly_schedule", supabaseUrl);
    url.searchParams.set("select", "tutor_name,date_key,label,arrival_time,blocks");
    url.searchParams.set("tutor_name", `eq.${tutor}`);
    url.searchParams.set("date_key", `gte.${start}`);
    url.searchParams.append("date_key", `lte.${end}`);
    url.searchParams.set("order", "date_key.asc");

    const response = await fetch(url, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`
      }
    });

    const rows = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: rows.message || "이번 주 스케줄을 불러오지 못했습니다."
      });
    }

    const days = rows.map(row => ({
      dateKey: row.date_key,
      label: row.label || row.date_key,
      arrival: row.arrival_time || "",
      blocks: parseBlocks(row.blocks)
    }));

    return res.status(200).json({
      success: true,
      days
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}
