import { calculateDashboardMetrics } from "./dashboardMetrics";
import type { PantryEvent } from "@/features/pantry/pantryEvent";

const events: PantryEvent[] = [
  {
    id: "1",
    pantryItemId: "bread",
    itemName: "Bread",
    outcome: "consumed",
    occurredAt: "2026-10-06T09:00:00.000Z",
  },
  {
    id: "2",
    pantryItemId: "milk",
    itemName: "Milk",
    outcome: "wasted",
    occurredAt: "2026-10-05T09:00:00.000Z",
  },
  {
    id: "3",
    pantryItemId: "rice",
    itemName: "Rice",
    outcome: "consumed",
    occurredAt: "2026-09-01T09:00:00.000Z",
  },
];

describe("calculateDashboardMetrics", () => {
  const now = new Date("2026-10-06T12:00:00.000Z");

  it("counts only the last seven calendar days for the weekly view", () => {
    const metrics = calculateDashboardMetrics(events, "weekly", now);

    expect(metrics).toMatchObject({
      consumed: 1,
      wasted: 1,
      total: 2,
      wastePercentage: 50,
    });
    expect(metrics.periods).toHaveLength(7);
    expect(
      metrics.periods.reduce(
        (count, period) => count + period.consumed + period.wasted,
        0,
      ),
    ).toBe(2);
  });

  it("groups the last thirty days into five monthly chart buckets", () => {
    const metrics = calculateDashboardMetrics(events, "monthly", now);

    expect(metrics).toMatchObject({ consumed: 1, wasted: 1, total: 2 });
    expect(metrics.periods).toHaveLength(5);
    expect(
      metrics.periods.reduce(
        (count, period) => count + period.consumed + period.wasted,
        0,
      ),
    ).toBe(2);
  });

  it("includes every event in the all-time view", () => {
    const metrics = calculateDashboardMetrics(events, "all-time", now);

    expect(metrics).toMatchObject({
      consumed: 2,
      wasted: 1,
      total: 3,
      wastePercentage: 33,
    });
    expect(metrics.periods).toHaveLength(2);
  });
});
