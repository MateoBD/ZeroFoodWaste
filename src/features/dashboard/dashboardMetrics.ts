import type {
  PantryEvent,
  PantryEventOutcome,
} from "@/features/pantry/pantryEvent";

/** The dashboard ranges supported by the food-waste report. */
export type DashboardTimeframe = "weekly" | "monthly" | "all-time";

/** One chart bucket containing outcomes recorded in a period. */
export type DashboardPeriod = Readonly<{
  key: string;
  label: string;
  consumed: number;
  wasted: number;
}>;

/** Calculated counts and chart buckets for one selected timeframe. */
export type DashboardMetrics = Readonly<{
  consumed: number;
  wasted: number;
  total: number;
  wastePercentage: number;
  periods: DashboardPeriod[];
}>;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function calendarDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function eventIsInTimeframe(
  event: PantryEvent,
  timeframe: DashboardTimeframe,
  now: Date,
): boolean {
  if (timeframe === "all-time") return true;

  const today = startOfDay(now);
  const rangeStart =
    timeframe === "weekly" ? addDays(today, -6) : addDays(today, -29);
  const eventDate = new Date(event.occurredAt);
  return eventDate >= rangeStart && eventDate < addDays(today, 1);
}

/**
 * Returns the outcome events represented by one dashboard metric.
 *
 * This is shared by the metric counts and the dashboard's restore list so
 * both surfaces always use identical timeframe boundaries.
 */
export function filterDashboardEvents(
  events: readonly PantryEvent[],
  timeframe: DashboardTimeframe,
  outcome?: PantryEventOutcome,
  now: Date = new Date(),
): PantryEvent[] {
  return events.filter(
    (event) =>
      (!outcome || event.outcome === outcome) &&
      eventIsInTimeframe(event, timeframe, now),
  );
}

function formatDayLabel(date: Date): string {
  return new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(date);
}

function formatWeekLabel(startDate: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(startDate);
}

function formatMonthLabel(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    year: "numeric",
  }).format(date);
}

function createPeriods(
  timeframe: DashboardTimeframe,
  now: Date,
  events: readonly PantryEvent[],
): DashboardPeriod[] {
  if (timeframe === "weekly") {
    const firstDay = addDays(startOfDay(now), -6);
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(firstDay, index);
      return {
        key: calendarDayKey(date),
        label: formatDayLabel(date),
        consumed: 0,
        wasted: 0,
      };
    });
  }

  if (timeframe === "monthly") {
    const firstDay = addDays(startOfDay(now), -29);
    return Array.from({ length: 5 }, (_, index) => {
      const date = addDays(firstDay, index * 7);
      return {
        key: `week-${calendarDayKey(date)}`,
        label: formatWeekLabel(date),
        consumed: 0,
        wasted: 0,
      };
    });
  }

  const monthKeys = new Set(
    events.map((event) => monthKey(new Date(event.occurredAt))),
  );
  return [...monthKeys].sort().map((key) => {
    const [year, month] = key.split("-").map(Number);
    return {
      key,
      label: formatMonthLabel(new Date(year, month - 1, 1)),
      consumed: 0,
      wasted: 0,
    };
  });
}

function periodIndexForEvent(
  eventDate: Date,
  timeframe: DashboardTimeframe,
  now: Date,
  periods: readonly DashboardPeriod[],
): number {
  if (timeframe === "weekly")
    return periods.findIndex(
      (period) => period.key === calendarDayKey(eventDate),
    );
  if (timeframe === "all-time")
    return periods.findIndex((period) => period.key === monthKey(eventDate));

  const firstDay = addDays(startOfDay(now), -29);
  const elapsedDays = Math.floor(
    (startOfDay(eventDate).getTime() - firstDay.getTime()) / 86_400_000,
  );
  return elapsedDays >= 0 && elapsedDays < 30
    ? Math.min(Math.floor(elapsedDays / 7), 4)
    : -1;
}

/**
 * Aggregates durable pantry outcomes into dashboard cards and chart buckets.
 *
 * Weekly means the current day and six preceding calendar days. Monthly means
 * the current day and 29 preceding days, grouped into five chart buckets.
 * All-time includes every stored event grouped by calendar month.
 *
 * @param events - Consumed and wasted outcomes from the pantry history.
 * @param timeframe - The range selected by the user.
 * @param now - The current local date, injectable for deterministic tests.
 * @returns Counts, waste percentage, and chart-ready periods.
 */
export function calculateDashboardMetrics(
  events: readonly PantryEvent[],
  timeframe: DashboardTimeframe,
  now: Date = new Date(),
): DashboardMetrics {
  const periods = createPeriods(timeframe, now, events);
  const periodCounts = periods.map((period) => ({ ...period }));
  let consumed = 0;
  let wasted = 0;

  for (const event of events) {
    if (!eventIsInTimeframe(event, timeframe, now)) continue;
    const eventDate = new Date(event.occurredAt);
    if (event.outcome === "consumed") consumed += 1;
    else wasted += 1;

    const periodIndex = periodIndexForEvent(
      eventDate,
      timeframe,
      now,
      periodCounts,
    );
    if (periodIndex < 0) continue;
    const period = periodCounts[periodIndex];
    periodCounts[periodIndex] = {
      ...period,
      consumed: period.consumed + (event.outcome === "consumed" ? 1 : 0),
      wasted: period.wasted + (event.outcome === "wasted" ? 1 : 0),
    };
  }

  const total = consumed + wasted;
  return {
    consumed,
    wasted,
    total,
    wastePercentage: total === 0 ? 0 : Math.round((wasted / total) * 100),
    periods: periodCounts,
  };
}
