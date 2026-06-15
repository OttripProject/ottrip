import { usePlansQuery } from "@/hooks/usePlansQuery";
import type { Plan } from "@/types/api";
import type React from "react";
import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
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

  useEffect(() => {
    if (!selectedPlan && plansQuery.plans.length > 0) {
      setSelectedPlan(plansQuery.plans[0]);
    }
  }, [plansQuery.plans, selectedPlan]);

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
