import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render } from "@testing-library/react-native";
import { useLocales } from "expo-localization";

import { DashboardScreen } from "./DashboardScreen";
import { PantryProvider } from "@/features/pantry/PantryContext";
import { PANTRY_EVENT_STORAGE_KEY } from "@/features/pantry/pantryEventRepository";

jest.mock("expo-localization", () => ({ useLocales: jest.fn() }));

const mockUseLocales = useLocales as jest.Mock;

function isoDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

describe("DashboardScreen", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockUseLocales.mockReturnValue([{ languageCode: "en" }]);
    await AsyncStorage.clear();
    await AsyncStorage.setItem(
      PANTRY_EVENT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        events: [
          {
            id: "event-1",
            pantryItemId: "bread",
            itemName: "Bread",
            outcome: "consumed",
            occurredAt: isoDaysAgo(0),
          },
          {
            id: "event-2",
            pantryItemId: "milk",
            itemName: "Milk",
            outcome: "wasted",
            occurredAt: isoDaysAgo(1),
          },
        ],
      }),
    );
  });

  it("shows live consumed, thrown-away, and waste-rate metrics", async () => {
    const screen = await render(
      <PantryProvider>
        <DashboardScreen />
      </PantryProvider>,
    );

    expect(
      await screen.findByRole("header", { name: "Waste dashboard" }),
    ).toBeTruthy();
    expect(screen.getByText("Consumed versus thrown away")).toBeTruthy();
    expect(screen.getByText("50%")).toBeTruthy();
    expect(screen.getByLabelText("Consumed: 1, Thrown away: 1")).toBeTruthy();
  });

  it("changes the chart range when a timeframe is selected", async () => {
    const screen = await render(
      <PantryProvider>
        <DashboardScreen />
      </PantryProvider>,
    );

    await screen.findByRole("header", { name: "Waste dashboard" });
    await fireEvent.press(screen.getByRole("tab", { name: "Monthly" }));

    expect(
      screen.getByRole("tab", { name: "Monthly" }).props.accessibilityState
        .selected,
    ).toBe(true);
    expect(screen.getByText("Outcomes over time")).toBeTruthy();
  });
});
