import { usePlansQuery } from "@/hooks/usePlansQuery";
import type { Plan } from "@/types/api";
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
    if (!current) {
      setSelectedPlan(plansQuery.plans[0]);
    } else {
      const updated = plansQuery.plans.find(p => p.id === current.id);
      if (updated && (updated.startDate !== current.startDate || updated.endDate !== current.endDate)) {
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
