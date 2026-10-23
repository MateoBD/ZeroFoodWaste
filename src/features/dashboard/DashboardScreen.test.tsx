import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { useLocales } from "expo-localization";
import { StyleSheet } from "react-native";

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
    expect(screen.getByLabelText("Consumed units: 1, Wasted units: 1")).toBeTruthy();
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

  it("lays out Spanish dashboard metrics responsively", async () => {
    mockUseLocales.mockReturnValue([{ languageCode: "es" }]);
    const screen = await render(
      <PantryProvider>
        <DashboardScreen />
      </PantryProvider>,
    );

    expect(
      await screen.findByRole("header", { name: "Resumen de desperdicio" }),
    ).toBeTruthy();
    expect(screen.getAllByText("Unidades consumidas").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Unidades desperdiciadas").length).toBeGreaterThan(0);
    expect(screen.getByText("Tasa de desperdicio")).toBeTruthy();
    expect(
      StyleSheet.flatten(screen.getByTestId("dashboard-summary-grid").props.style),
    ).toMatchObject({ flexDirection: "row", flexWrap: "wrap" });
    expect(
      StyleSheet.flatten(
        screen.getByRole("button", { name: "Unidades consumidas: 1" }).props.style,
      ).width,
    ).toBe("48%");
    expect(
      StyleSheet.flatten(screen.getByTestId("dashboard-waste-rate-card").props.style)
        .width,
    ).toBe("100%");
    expect(
      StyleSheet.flatten(screen.getByTestId("dashboard-legend").props.style)
        .flexWrap,
    ).toBe("wrap");
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

    await screen.findByRole("button", { name: "Wasted units: 1" });
    await fireEvent.press(
      screen.getByRole("button", { name: "Wasted units: 1" }),
    );

    expect(screen.getByText("Thrown-away foods")).toBeTruthy();
    expect(
      within(
        screen.getByTestId("dashboard-scroll", {
          includeHiddenElements: true,
        }),
      ).queryByText("Thrown-away foods"),
    ).toBeNull();
    expect(screen.getByText("Milk")).toBeTruthy();
    await fireEvent.press(
      screen.getByRole("button", { name: "Restore to pantry: Milk" }),
    );

    expect(screen.getByText("No foods recorded in this timeframe.")).toBeTruthy();
    await waitFor(async () => {
      expect(JSON.parse((await AsyncStorage.getItem(PANTRY_STORAGE_KEY)) ?? "null")).toEqual({
        version: 4,
        items: [{ ...milk, quantity: 1 }],
        events: [],
      });
    });
  });

  it("restores only one event amount while preserving later pantry changes", async () => {
    const snapshot = {
      id: "bread",
      name: "Bread",
      recipeIngredient: null,
      expirationDate: "2999-10-15",
      createdAt: "2026-09-01T10:00:00.000Z",
      quantity: 5,
    };
    await AsyncStorage.setItem(PANTRY_STORAGE_KEY, JSON.stringify({
      version: 4,
      items: [{ ...snapshot, name: "Toast", quantity: 3 }],
      events: [{
        id: "event-bread",
        pantryItemId: snapshot.id,
        itemName: snapshot.name,
        outcome: "consumed",
        amount: 2,
        occurredAt: isoDaysAgo(0),
        itemSnapshot: snapshot,
      }],
    }));

    const screen = await render(
      <PantryProvider>
        <DashboardScreen />
      </PantryProvider>,
    );
    await fireEvent.press(await screen.findByRole("button", { name: "Consumed units: 2" }));
    expect(screen.getAllByText("2 units").length).toBeGreaterThan(0);
    await fireEvent.press(screen.getByRole("button", { name: "Restore to pantry: Bread" }));

    await waitFor(async () => {
      const document = JSON.parse((await AsyncStorage.getItem(PANTRY_STORAGE_KEY))!);
      expect(document.items).toEqual([{ ...snapshot, name: "Toast", quantity: 5 }]);
      expect(document.events).toEqual([]);
    });
  });
});
