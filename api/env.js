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

export function requireGasUrl() {
  const gasUrl = process.env.GAS_URL || readLocalEnvValue("GAS_URL");

  if (!gasUrl) {
    throw new Error("GAS_URL 환경변수가 설정되지 않았습니다.");
  }

  return gasUrl;
}
