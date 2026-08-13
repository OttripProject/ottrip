import dayjs from "dayjs";

export interface PlanDateInfo {
  id: string | number;
  startDate?: string;
  endDate?: string;
  [key: string]: any;
}

export const sortPlansByDate = <T extends PlanDateInfo>(plans: T[]): T[] => {
  if (!plans || plans.length === 0) return [];

  const todayStr = dayjs().format("YYYY-MM-DD");

  const ongoing = plans
    .filter((p) => p.startDate && p.endDate && p.startDate <= todayStr && todayStr <= p.endDate)
    .sort((a, b) => a.startDate!.localeCompare(b.startDate!));

  const upcoming = plans
    .filter((p) => p.startDate && p.startDate > todayStr)
    .sort((a, b) => a.startDate!.localeCompare(b.startDate!));

  const past = plans
    .filter((p) => p.endDate && p.endDate < todayStr)
    .sort((a, b) => b.endDate!.localeCompare(a.endDate!));

  return [...ongoing, ...upcoming, ...past];
};