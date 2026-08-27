/**
 * 미터 단위 거리 → 도보 시간 또는 거리 문자열 반환
 * - dist <= 0: null 반환
 * - dist < 100m: "바로 옆"
 * - 도보 20분 이하: "도보 N분"
 * - 도보 20분 초과: "N.Nkm"
 */
export function formatWalkTime(dist: number): string | null {
  if (dist <= 0) return null;
  if (dist < 100) return "바로 옆";
  const minutes = Math.ceil((dist * 1.3) / 67);
  if (minutes > 20) return `${(dist / 1000).toFixed(1)}km`;
  return `도보 ${minutes}분`;
}
