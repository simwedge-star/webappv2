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

export default async function handler(req, res) {
  try {
    const supabaseUrl = getEnvValue("SUPABASE_URL");
    const supabaseKey = getEnvValue("SUPABASE_SERVICE_ROLE_KEY") || getEnvValue("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        success: false,
        message: "Supabase 환경변수가 설정되지 않았습니다."
      });
    }

    const url = new URL("/rest/v1/calendar_dates", supabaseUrl);
    url.searchParams.set("select", "date_key,label,gid");
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
        message: rows.message || "날짜를 불러오지 못했습니다."
      });
    }

    const dates = rows.map(row => ({
      value: row.date_key,
      dateKey: row.date_key,
      label: row.label,
      gid: row.gid
    }));

    return res.status(200).json({
      success: true,
      dates
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}
