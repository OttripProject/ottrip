import { plansApi } from "@/services/plans";

export function collectPlanItemDates(
  itineraries: Array<{ itineraryDate: string }>,
  flights: Array<{
    flightSegments?: Array<{ departureTime?: string | null; arrivalTime?: string | null }>;
  }>,
  accommodations: Array<{ checkinDate: string; checkoutDate: string }>,
): string[] {
  return [
    ...itineraries.map(it => it.itineraryDate),
    ...accommodations.flatMap(acc => [acc.checkinDate, acc.checkoutDate]),
    ...flights.flatMap(f =>
      f.flightSegments?.flatMap(s => [
        s.departureTime?.substring(0, 10) ?? null,
        s.arrivalTime?.substring(0, 10) ?? null,
      ]) ?? [],
    ),
  ].filter(Boolean) as string[];
}

export async function shrinkPlanIfNeeded(
  planId: number,
  plan:
    | {
        startDate: string;
        endDate: string;
        segments?: { country: string; city: string; startDate: string; endDate: string }[];
      }
    | null
    | undefined,
  remainingDates: (string | null | undefined)[],
): Promise<void> {
  if (!plan?.segments?.length) return;

  const validDates = remainingDates
    .map(d => (d ? String(d).substring(0, 10) : ""))
    .filter(d => d && /^\d{4}-\d{2}-\d{2}$/.test(d));

  if (validDates.length === 0) return;

  const newStart = validDates.reduce((a, b) => (a < b ? a : b));
  const newEnd = validDates.reduce((a, b) => (a > b ? a : b));

  // 축소 방향으로만 적용: 시작은 더 늦은 값으로, 종료는 더 이른 값으로
  const effectiveStart = newStart > plan.startDate ? newStart : plan.startDate;
  const effectiveEnd = newEnd < plan.endDate ? newEnd : plan.endDate;

  // 남은 아이템이 플랜 범위 바깥에 있어 유효하지 않은 범위가 생기면 무시
  if (effectiveStart > effectiveEnd) return;
  // 변경 없으면 API 호출 생략
  if (effectiveStart === plan.startDate && effectiveEnd === plan.endDate) return;

  const updatedSegments = plan.segments.map((seg, idx) => ({
    country: seg.country,
    city: seg.city,
    startDate: idx === 0 ? effectiveStart : seg.startDate,
    endDate: idx === plan.segments!.length - 1 ? effectiveEnd : seg.endDate,
  }));

  await plansApi.updatePlan(planId, { segments: updatedSegments });
}
