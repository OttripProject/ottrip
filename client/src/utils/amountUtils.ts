/**
 * 금액 입력 필드용 유틸
 * - 숫자만 추출 (쉼표, 소수점 제거)
 * - 천 단위 콤마 포맷
 */

export function normalizeAmount(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  return raw.replace(/[^0-9]/g, "");
}

export function formatAmountWithCommas(value: unknown): string {
  const digits = normalizeAmount(value);
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
