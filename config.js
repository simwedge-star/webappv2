const env = typeof process !== "undefined" && process.env ? process.env : {};

export const GAS_URL = env.GAS_URL || "";

export const MAIN_SHEET_URL = "https://docs.google.com/spreadsheets/d/1FR7Vrs_TEkmD8l34aHTNaLGB_ZiTnk6nCfSbjLacGA0/edit?gid=378762600#gid=378762600";
export const DAILY_SHEET_URL = "https://docs.google.com/spreadsheets/d/1YhbjTuymC1-txIGLgw-5SC2MOhlD3dgwLbGYjRFP-YA/edit?gid=274681049#gid=274681049";

export function requireGasUrl() {
  if (!GAS_URL) {
    throw new Error("GAS_URL 환경변수가 설정되지 않았습니다.");
  }

  return GAS_URL;
}
