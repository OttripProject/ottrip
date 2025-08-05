import React, { createContext, useContext, useState } from "react";

export interface DateContextValue {
  selectedDate: string; // ISO YYYY-MM-DD
  setSelectedDate: (date: string) => void;
}

const DateContext = createContext<DateContextValue | undefined>(undefined);

export function DateProvider({ children }: { children: React.ReactNode }) {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  return (
    <DateContext.Provider value={{ selectedDate, setSelectedDate }}>
      {children}
    </DateContext.Provider>
  );
}

export function useDate() {
  const ctx = useContext(DateContext);
  if (!ctx) throw new Error("useDate must be used within DateProvider");
  return ctx;
}
