import { DashboardScreen } from "@/features/dashboard/DashboardScreen";

/**
 * Composes the dashboard tab from the shared pantry outcome history so the
 * route displays live consumed and thrown-away metrics from the provider.
 *
 * @return {React.JSX.Element} The dashboard tab content connected to shared pantry state.
 */
export default function DashboardTabRoute() {
  return <DashboardScreen />;
}
