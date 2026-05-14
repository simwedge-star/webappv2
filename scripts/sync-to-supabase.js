const fs = require("node:fs");
const path = require("node:path");

const ENV_PATH = path.join(process.cwd(), ".env.local");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const text = fs.readFileSync(filePath, "utf8");

  text.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) return;

    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();

    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

function requiredEnv(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} 값이 없습니다. .env.local에 추가해 주세요.`);
  }
  return value;
}

function buildGasUrl(mode, params = {}) {
  const url = new URL(requiredEnv("GAS_URL"));
  url.searchParams.set("mode", mode);

  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });

  return url;
}

async function fetchGas(mode, params) {
  const url = buildGasUrl(mode, params);
  console.log(`[GAS] ${mode} 호출 시작: ${url.toString()}`);

  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error(`[GAS] ${mode} fetch 실패: ${error.message}`);
  }

  console.log(`[GAS] ${mode} 응답 상태: ${response.status} ${response.statusText}`);

  let data;
  try {
    data = await response.json();
  } catch (error) {
    const text = await response.text().catch(() => "");
    throw new Error(`[GAS] ${mode} JSON 파싱 실패: ${error.message}${text ? ` / 응답 일부: ${text.slice(0, 200)}` : ""}`);
  }

  if (!response.ok || data.success === false) {
    throw new Error(data.message || `${mode} 데이터를 불러오지 못했습니다.`);
  }

  console.log(`[GAS] ${mode} 데이터 읽기 완료`);
  return data;
}

async function supabaseUpsert(table, rows, onConflict) {
  if (!rows.length) {
    console.log(`${table}: 저장할 데이터가 없습니다.`);
    return;
  }

  const supabaseUrl = requiredEnv("SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const url = new URL(`/rest/v1/${table}`, supabaseUrl);
  url.searchParams.set("on_conflict", onConflict);

  console.log(`[Supabase] 환경 확인: SUPABASE_URL=${maskUrl(supabaseUrl)}, SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey ? "있음(숨김)" : "비어 있음"}`);
  console.log(`[Supabase] ${table} rows 샘플 키: ${Object.keys(rows[0] || {}).join(", ")}`);
  console.log(`[Supabase] ${table} upsert 시작: ${rows.length}개, on_conflict=${onConflict}`);
  console.log(`[Supabase] ${table} 호출 URL: ${url.toString()}`);

  let response;
  try {
    console.log(`[Supabase] ${table} fetch 직전`);
    response = await fetch(url, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates"
      },
      body: JSON.stringify(rows)
    });
    console.log(`[Supabase] ${table} fetch 직후`);
  } catch (error) {
    console.error(`[Supabase] ${table} fetch 실패 message: ${error.message}`);
    console.error(`[Supabase] ${table} fetch 실패 stack: ${error.stack || "(stack 없음)"}`);
    throw new Error(`[Supabase] ${table} fetch 실패: ${error.message}`);
  }

  console.log(`[Supabase] ${table} 응답 상태: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${table} upsert 실패: ${errorText}`);
  }

  console.log(`${table}: ${rows.length}개 저장 완료`);
}

function maskUrl(value) {
  if (!value) return "비어 있음";

  try {
    const url = new URL(value);
    return `${url.protocol}//${url.hostname.slice(0, 8)}...`;
  } catch (error) {
    return "URL 형식 오류";
  }
}

function toCalendarDateRows(data) {
  return (data.dates || []).map(item => ({
    date_key: item.value,
    label: item.label || item.value,
    gid: item.gid || null
  }));
}

function normalizeWeeklyDays(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.days)) return data.days;
  if (Array.isArray(data.weekly)) return data.weekly;
  if (Array.isArray(data.schedules)) return data.schedules;

  if (data.weekly && typeof data.weekly === "object") {
    return Object.entries(data.weekly).flatMap(([tutor, days]) => {
      if (!Array.isArray(days)) return [];
      return days.map(day => ({ tutor, ...day }));
    });
  }

  if (data.tutors && typeof data.tutors === "object") {
    return Object.entries(data.tutors).flatMap(([tutor, days]) => {
      if (!Array.isArray(days)) return [];
      return days.map(day => ({ tutor, ...day }));
    });
  }

  return [];
}

function toWeeklyScheduleRows(data) {
  const rows = normalizeWeeklyDays(data).map(day => ({
    tutor_name: day.tutor_name || day.tutorName || day.tutor || day.name || "",
    date_key: day.date_key || day.dateKey || day.date || day.value || "",
    label: day.label || day.date_key || day.dateKey || day.date || day.value || "",
    arrival_time: day.arrival_time || day.arrivalTime || day.arrival || null,
    blocks: blocksToText(day.blocks)
  })).filter(row => row.tutor_name && row.date_key);

  return mergeWeeklyRows(rows);
}

function mergeWeeklyRows(rows) {
  const merged = new Map();

  rows.forEach(row => {
    const key = `${row.tutor_name}||${row.date_key}`;
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, { ...row });
      return;
    }

    if (!existing.arrival_time && row.arrival_time) {
      existing.arrival_time = row.arrival_time;
    }

    existing.blocks = mergeBlocksText(existing.blocks, row.blocks);
  });

  return Array.from(merged.values());
}

function blocksToText(blocks) {
  if (typeof blocks === "string") {
    return normalizeBlockList(blocks.split(",")).join(",");
  }

  if (!Array.isArray(blocks)) return "";

  const blockNames = blocks
    .map(block => {
      if (typeof block === "string") return block;
      return block.block || block.name || block.label || "";
    });

  return normalizeBlockList(blockNames).join(",");
}

function mergeBlocksText(first, second) {
  return normalizeBlockList([
    ...String(first || "").split(","),
    ...String(second || "").split(",")
  ]).join(",");
}

function normalizeBlockList(blocks) {
  return Array.from(new Set(
    blocks
      .map(block => String(block || "").trim())
      .filter(Boolean)
  )).sort();
}

function toStudentLinkRows(data) {
  const links = data.links || {};
  const managerMap = data.managerMap || {};

  return Object.keys(links).filter(key => links[key]).map(key => ({
    student_key: key,
    url: links[key],
    manager_name: managerMap[key] || null
  }));
}

async function main() {
  loadEnvFile(ENV_PATH);

  console.log("GAS -> Supabase 동기화를 시작합니다.");

  console.log("[Step] dates 동기화 시작");
  const datesData = await fetchGas("dates");
  const dateRows = toCalendarDateRows(datesData);
  console.log(`[Step] dates 변환 완료: ${dateRows.length}개`);
  await supabaseUpsert("calendar_dates", dateRows, "date_key");

  console.log("[Step] weekly_all 동기화 시작");
  const weeklyData = await fetchGas("weekly_all");
  const weeklyRows = toWeeklyScheduleRows(weeklyData);
  console.log(`[Step] weekly_all 변환 완료: ${weeklyRows.length}개`);
  await supabaseUpsert("weekly_schedule", weeklyRows, "tutor_name,date_key");

  console.log("[Step] links 동기화 시작");
  const linksData = await fetchGas("links");
  const linkRows = toStudentLinkRows(linksData);
  console.log(`[Step] links 변환 완료: ${linkRows.length}개`);
  await supabaseUpsert("student_links", linkRows, "student_key");

  console.log("동기화가 끝났습니다.");
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
