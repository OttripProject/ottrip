import RootNavigator from "@/navigation/RootNavigator";
import { StatusBar } from "expo-status-bar";
import QueryProvider from "@/contexts/QueryProvider";
import { DateProvider } from "@/contexts/DateContext";

export default function App() {
  return (
    <DateProvider>
      <QueryProvider>
        <RootNavigator />
        <StatusBar style="auto" />
      </QueryProvider>
    </DateProvider>
  );
}
