import { usePlansQuery } from "@/hooks/usePlansQuery";
import type { Plan } from "@/types/api";
import dayjs from "dayjs";
import type React from "react";
import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

interface SelectedPlanContextType {
  selectedPlan: Plan | null;
  setSelectedPlan: (plan: Plan | null) => void;
}

const SelectedPlanContext = createContext<SelectedPlanContextType | undefined>(
  undefined,
);

interface SelectedPlanProviderProps {
  children: ReactNode;
}

const getDefaultPlan = (plans: Plan[]): Plan | null => {
  if (!plans || plans.length === 0) return null;

  const todayStr = dayjs().format("YYYY-MM-DD");

  const ongoingPlans = plans
    .filter((p) => {
      if (!p.startDate || !p.endDate) return false;
      const start = dayjs(p.startDate).format("YYYY-MM-DD");
      const end = dayjs(p.endDate).format("YYYY-MM-DD");
      return start <= todayStr && todayStr <= end;
    })
    .sort((a, b) =>
      dayjs(a.startDate).format("YYYY-MM-DD").localeCompare(dayjs(b.startDate).format("YYYY-MM-DD"))
    );

  if (ongoingPlans.length > 0) return ongoingPlans[0];

  const futurePlans = plans
    .filter((p) => {
      if (!p.startDate) return false;
      const start = dayjs(p.startDate).format("YYYY-MM-DD");
      return start > todayStr;
    })
    .sort((a, b) =>
      dayjs(a.startDate).format("YYYY-MM-DD").localeCompare(dayjs(b.startDate).format("YYYY-MM-DD"))
    );

  if (futurePlans.length > 0) return futurePlans[0];

  const pastPlans = plans
    .filter((p) => {
      if (!p.endDate) return false;
      const end = dayjs(p.endDate).format("YYYY-MM-DD");
      return end < todayStr;
    })
    .sort((a, b) =>
      dayjs(b.endDate).format("YYYY-MM-DD").localeCompare(dayjs(a.endDate).format("YYYY-MM-DD"))
    );

  if (pastPlans.length > 0) return pastPlans[0];

  return plans[0];
};

export const SelectedPlanProvider: React.FC<SelectedPlanProviderProps> = ({
  children,
}) => {
  const plansQuery = usePlansQuery();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const selectedPlanRef = useRef<Plan | null>(null);
  selectedPlanRef.current = selectedPlan;

  useEffect(() => {
    if (plansQuery.plans.length === 0) return;
    const current = selectedPlanRef.current;

    // 선택된 플랜이 없을 경우 새 우선순위 로직으로 디폴트 플랜 선택
    if (!current) {
      setSelectedPlan(getDefaultPlan(plansQuery.plans));
    } else {
      const updated = plansQuery.plans.find((p) => p.id === current.id);
      if (
        updated &&
        (updated.startDate !== current.startDate ||
          updated.endDate !== current.endDate)
      ) {
        setSelectedPlan(updated);
      }
    }
  }, [plansQuery.plans]);

  return (
    <SelectedPlanContext.Provider value={{ selectedPlan, setSelectedPlan }}>
      {children}
    </SelectedPlanContext.Provider>
  );
};

export const useSelectedPlan = () => {
  const context = useContext(SelectedPlanContext);
  if (context === undefined) {
    throw new Error("useSelectedPlan must be used within SelectedPlanProvider");
  }
  return context;
};