import {
  calculateDashboardMetrics,
  filterDashboardEvents,
} from "./dashboardMetrics";
import type { PantryEvent } from "@/features/pantry/pantryEvent";

const events: PantryEvent[] = [
  {
    id: "1",
    pantryItemId: "bread",
    itemName: "Bread",
    outcome: "consumed",
    amount: 2,
    occurredAt: "2026-10-06T09:00:00.000Z",
  },
  {
    id: "2",
    pantryItemId: "milk",
    itemName: "Milk",
    outcome: "wasted",
    amount: 3,
    occurredAt: "2026-10-05T09:00:00.000Z",
  },
  {
    id: "3",
    pantryItemId: "rice",
    itemName: "Rice",
    outcome: "consumed",
    amount: 4,
    occurredAt: "2026-09-01T09:00:00.000Z",
  },
];

describe("calculateDashboardMetrics", () => {
  const now = new Date("2026-10-06T12:00:00.000Z");

  it("counts only the last seven calendar days for the weekly view", () => {
    const metrics = calculateDashboardMetrics(events, "weekly", now);

    expect(metrics).toMatchObject({
      consumed: 2,
      wasted: 3,
      total: 5,
      wastePercentage: 60,
    });
    expect(metrics.periods).toHaveLength(7);
    expect(
      metrics.periods.reduce(
        (count, period) => count + period.consumed + period.wasted,
        0,
      ),
    ).toBe(5);
  });

  it("groups the last thirty days into five monthly chart buckets", () => {
    const metrics = calculateDashboardMetrics(events, "monthly", now);

    expect(metrics).toMatchObject({ consumed: 2, wasted: 3, total: 5 });
    expect(metrics.periods).toHaveLength(5);
    expect(
      metrics.periods.reduce(
        (count, period) => count + period.consumed + period.wasted,
        0,
      ),
    ).toBe(5);
  });

  it("includes every event in the all-time view", () => {
    const metrics = calculateDashboardMetrics(events, "all-time", now);

    expect(metrics).toMatchObject({
      consumed: 6,
      wasted: 3,
      total: 9,
      wastePercentage: 33,
    });
    expect(metrics.periods).toHaveLength(2);
  });

  it("filters the events shown by a metric using the selected timeframe", () => {
    expect(filterDashboardEvents(events, "weekly", "wasted", now)).toEqual([
      events[1],
    ]);
    expect(filterDashboardEvents(events, "all-time", "consumed", now)).toEqual([
      events[0],
      events[2],
    ]);
  });
});
