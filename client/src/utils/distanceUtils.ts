/**
 * 미터 단위 거리 → 도보 시간 또는 거리 문자열 반환
 * - dist <= 0: null 반환
 * - dist < 100m: "바로 옆"
 * - 도보 20분 이하: "도보 N분"
 * - 도보 20분 초과: "N.Nkm"
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatWalkTime(dist: number): string | null {
  if (dist <= 0) return null;
  if (dist < 100) return "바로 옆";
  const minutes = Math.ceil((dist * 1.3) / 67);
  if (minutes > 20) return `${(dist / 1000).toFixed(1)}km`;
  return `도보 ${minutes}분`;
}
