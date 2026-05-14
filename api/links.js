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
        message: "links_supabase_test."
      });
    }

    const url = new URL("/rest/v1/student_links", supabaseUrl);
    url.searchParams.set("select", "student_key,url,manager_name");
    url.searchParams.set("order", "student_key.asc");

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
        message: rows.message || "링크를 불러오지 못했습니다."
      });
    }

    const links = {};
    const managerMap = {};

    rows.forEach(row => {
      if (!row.student_key || !row.url) return;

      links[row.student_key] = row.url;

      if (row.manager_name) {
        managerMap[row.student_key] = row.manager_name;
      }
    });

    return res.status(200).json({
      success: true,
      links,
      managerMap
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}
