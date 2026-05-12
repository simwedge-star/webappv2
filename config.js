const env = typeof process !== "undefined" && process.env ? process.env : {};

export const GAS_URL = env.GAS_URL || "";

export const MAIN_SHEET_URL = "";
export const DAILY_SHEET_URL = "";

export function requireGasUrl() {
  if (!GAS_URL) {
    throw new Error("GAS_URL 환경변수가 설정되지 않았습니다.");
  }

  return GAS_URL;
}
