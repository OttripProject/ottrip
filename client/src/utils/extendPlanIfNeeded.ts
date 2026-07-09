import { plansApi } from "@/services/plans";

export async function extendPlanIfNeeded(
  planId: number,
  plan: { startDate: string; endDate: string; segments?: { country: string; city: string; startDate: string; endDate: string }[] } | null | undefined,
  dates: (string | null | undefined)[],
): Promise<void> {
  if (!plan?.segments?.length) return;

  const validDates = dates
    .map(d => (d ? String(d).substring(0, 10) : ""))
    .filter(d => d && /^\d{4}-\d{2}-\d{2}$/.test(d));

  if (validDates.length === 0) return;

  const minDate = validDates.reduce((a, b) => (a < b ? a : b));
  const maxDate = validDates.reduce((a, b) => (a > b ? a : b));

  if (minDate >= plan.startDate && maxDate <= plan.endDate) return;

  const updatedSegments = plan.segments.map((seg, idx) => ({
    country: seg.country,
    city: seg.city,
    startDate: idx === 0 && minDate < seg.startDate ? minDate : seg.startDate,
    endDate: idx === plan.segments!.length - 1 && maxDate > seg.endDate ? maxDate : seg.endDate,
  }));

  await plansApi.updatePlan(planId, { segments: updatedSegments });
}
