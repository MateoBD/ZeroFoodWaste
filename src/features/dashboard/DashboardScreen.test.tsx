import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useLocales } from "expo-localization";

import { DashboardScreen } from "./DashboardScreen";
import { PantryProvider } from "@/features/pantry/PantryContext";
import { PANTRY_STORAGE_KEY } from "@/features/pantry/pantryRepository";
import { PANTRY_EVENT_STORAGE_KEY } from "@/features/pantry/pantryEventRepository";

jest.mock("expo-localization", () => ({ useLocales: jest.fn() }));

const mockUseLocales = useLocales as jest.Mock;

/**
 * Produces a canonical timestamp a fixed number of calendar days before now
 * for deterministic dashboard event fixtures.
 *
 * @param days - The number of calendar days to subtract from the current date.
 * @return {string} The resulting timestamp in canonical ISO format.
 */
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

  it("opens the selected outcome and restores a food to the pantry", async () => {
    const milk = {
      id: "milk",
      name: "Milk",
      recipeIngredient: null,
      expirationDate: "2026-10-15",
      createdAt: "2026-09-01T10:00:00.000Z",
    };
    await AsyncStorage.setItem(
      PANTRY_STORAGE_KEY,
      JSON.stringify({ version: 2, items: [] }),
    );
    await AsyncStorage.setItem(
      PANTRY_EVENT_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        events: [
          {
            id: "event-milk",
            pantryItemId: milk.id,
            itemName: milk.name,
            outcome: "wasted",
            occurredAt: isoDaysAgo(1),
            itemSnapshot: milk,
          },
        ],
      }),
    );

    const screen = await render(
      <PantryProvider>
        <DashboardScreen />
      </PantryProvider>,
    );

    await screen.findByRole("button", { name: "Thrown away: 1" });
    await fireEvent.press(
      screen.getByRole("button", { name: "Thrown away: 1" }),
    );

    expect(screen.getByText("Thrown-away foods")).toBeTruthy();
    expect(screen.getByText("Milk")).toBeTruthy();
    await fireEvent.press(
      screen.getByRole("button", { name: "Restore to pantry: Milk" }),
    );

    expect(screen.getByText("No foods recorded in this timeframe.")).toBeTruthy();
    await waitFor(async () => {
      expect(JSON.parse((await AsyncStorage.getItem(PANTRY_EVENT_STORAGE_KEY)) ?? "null")).toEqual({
        version: 2,
        events: [],
      });
    });
    await waitFor(async () => {
      expect(JSON.parse((await AsyncStorage.getItem(PANTRY_STORAGE_KEY)) ?? "null")).toEqual({
        version: 2,
        items: [milk],
      });
    });
  });
});
