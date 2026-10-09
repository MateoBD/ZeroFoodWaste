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

/**
 * Normalizes a Date to local midnight so timeframe comparisons use calendar
 * days rather than the input time of day.
 *
 * @param date - The date whose local calendar day should be preserved.
 * @return {Date} A new Date representing local midnight on the same day.
 */
function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Creates a date shifted by a number of local calendar days while preserving
 * the original Date object and its time-of-day fields.
 *
 * @param date - The starting date for the calculation.
 * @param days - The signed number of calendar days to add.
 * @return {Date} A new Date shifted by the requested number of days.
 */
function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

/**
 * Converts a Date into the zero-padded local calendar key used by weekly
 * dashboard periods.
 *
 * @param date - The date whose local year, month, and day should be encoded.
 * @return {string} A `YYYY-MM-DD` calendar key.
 */
function calendarDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Converts a Date into the zero-padded local month key used by all-time
 * dashboard periods.
 *
 * @param date - The date whose local year and month should be encoded.
 * @return {string} A `YYYY-MM` month key.
 */
function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Determines whether an outcome belongs to the selected dashboard timeframe,
 * using local calendar boundaries for weekly and monthly views.
 *
 * @param event - The pantry outcome whose occurrence date is checked.
 * @param timeframe - The dashboard range against which the event is tested.
 * @param now - The local reference date used to calculate the range boundary.
 * @return {boolean} Whether the event falls within the selected timeframe.
 */
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
 * Returns the outcome events represented by one dashboard metric and applies
 * the same local calendar boundaries used to calculate dashboard totals.
 *
 * This is shared by the metric counts and the dashboard's restore list so
 * both surfaces always use identical timeframe boundaries.
 *
 * @param events - The complete stored consumed and wasted outcome history.
 * @param timeframe - The dashboard range whose events should be returned.
 * @param outcome - Optional outcome filter for consumed or wasted events.
 * @param now - The local reference date used to calculate relative ranges.
 * @return {PantryEvent[]} Events matching the selected range and optional outcome.
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

/**
 * Creates the short localized weekday label used by weekly dashboard periods.
 *
 * @param date - The period date whose weekday should be displayed.
 * @return {string} The localized abbreviated weekday label.
 */
function formatDayLabel(date: Date): string {
  return new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(date);
}

/**
 * Creates the localized month-and-day label used by monthly chart buckets.
 *
 * @param startDate - The first date represented by the chart bucket.
 * @return {string} The localized abbreviated month and day label.
 */
function formatWeekLabel(startDate: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(startDate);
}

/**
 * Creates the localized month-and-year label used by all-time chart buckets.
 *
 * @param date - The first day of the month represented by the bucket.
 * @return {string} The localized abbreviated month and year label.
 */
function formatMonthLabel(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * Builds the empty chart periods for the selected range, including historical
 * all-time months discovered from the stored event history.
 *
 * @param timeframe - The dashboard range whose periods should be created.
 * @param now - The local reference date used for relative ranges.
 * @param events - Stored events used to discover all-time month buckets.
 * @return {DashboardPeriod[]} Periods initialized with zero consumed and wasted counts.
 */
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

/**
 * Finds the chart period containing an event so the caller can increment the
 * appropriate consumed or wasted count without duplicating range logic.
 *
 * @param eventDate - The event occurrence date to place in a period.
 * @param timeframe - The dashboard range that defines period boundaries.
 * @param now - The local reference date used for monthly relative buckets.
 * @param periods - The initialized periods available for the selected range.
 * @return {number} The matching period index, or `-1` when the event is outside the chart.
 */
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
 * @return {DashboardMetrics} Counts, waste percentage, and chart-ready periods.
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
