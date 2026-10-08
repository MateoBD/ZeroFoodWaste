import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { AppText } from "@/components/ui/AppText";
import { Button, ButtonText } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import type {
  PantryEvent,
  PantryEventOutcome,
} from "@/features/pantry/pantryEvent";
import { useMessages } from "@/i18n/useMessages";
import { spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";
import { usePantry } from "@/features/pantry/PantryContext";

import {
  calculateDashboardMetrics,
  filterDashboardEvents,
  type DashboardTimeframe,
} from "./dashboardMetrics";

const timeframeOptions: {
  value: DashboardTimeframe;
  labelKey: "timeframeWeekly" | "timeframeMonthly" | "timeframeAllTime";
}[] = [
  { value: "weekly", labelKey: "timeframeWeekly" },
  { value: "monthly", labelKey: "timeframeMonthly" },
  { value: "all-time", labelKey: "timeframeAllTime" },
];

/**
 * Displays consumed-versus-wasted metrics sourced from the shared pantry history.
 *
 * @returns The dashboard tab content.
 */
export function DashboardScreen() {
  const { events, status, restoreEvent } = usePantry();
  const { colors } = useTheme();
  const t = useMessages();
  const [timeframe, setTimeframe] = useState<DashboardTimeframe>("weekly");
  const [selectedOutcome, setSelectedOutcome] =
    useState<PantryEventOutcome | null>(null);
  const metrics = useMemo(
    () => calculateDashboardMetrics(events, timeframe),
    [events, timeframe],
  );
  const selectedEvents = useMemo(() => {
    if (!selectedOutcome) return [];
    return filterDashboardEvents(events, timeframe, selectedOutcome).sort(
      (left, right) =>
        new Date(right.occurredAt).getTime() -
        new Date(left.occurredAt).getTime(),
    );
  }, [events, selectedOutcome, timeframe]);
  const maximumPeriodTotal = Math.max(
    1,
    ...metrics.periods.map((period) => period.consumed + period.wasted),
  );

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      style={[styles.screen, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <AppText accessibilityRole="header" variant="title">
          {t("dashboardTitle")}
        </AppText>
        <AppText variant="muted">{t("dashboardSubtitle")}</AppText>
      </View>

      <View
        accessibilityRole="tablist"
        style={[styles.timeframeSelector, { borderColor: colors.border }]}
      >
        {timeframeOptions.map((option) => {
          const isSelected = timeframe === option.value;
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              key={option.value}
              onPress={() => setTimeframe(option.value)}
              style={[
                styles.timeframeButton,
                isSelected ? { backgroundColor: colors.accent } : null,
              ]}
            >
              <AppText
                style={{ color: isSelected ? colors.accentText : colors.text }}
              >
                {t(option.labelKey)}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {status === "ready" ? (
        <>
          <View style={styles.summaryGrid}>
            <MetricCard
              label={t("consumedMetric")}
              value={metrics.consumed}
              color={colors.accent}
              onPress={() => setSelectedOutcome("consumed")}
            />
            <MetricCard
              label={t("wastedMetric")}
              value={metrics.wasted}
              color={colors.errorText}
              onPress={() => setSelectedOutcome("wasted")}
            />
            <MetricCard
              label={t("wasteRateMetric")}
              value={`${metrics.wastePercentage}%`}
              color={colors.text}
            />
          </View>

          <Surface style={styles.ratioCard}>
            <AppText style={styles.sectionTitle}>
              {t("consumedVsWasted")}
            </AppText>
            <View
              accessibilityLabel={`${t("consumedMetric")}: ${metrics.consumed}, ${t("wastedMetric")}: ${metrics.wasted}`}
              accessibilityRole="progressbar"
              style={[styles.ratioTrack, { backgroundColor: colors.errorText }]}
            >
              {metrics.total > 0 ? (
                <View
                  style={[
                    styles.consumedRatio,
                    {
                      backgroundColor: colors.accent,
                      width: `${(metrics.consumed / metrics.total) * 100}%`,
                    },
                  ]}
                />
              ) : null}
            </View>
            <View style={styles.legend}>
              <Legend color={colors.accent} label={t("consumedMetric")} />
              <Legend color={colors.errorText} label={t("wastedMetric")} />
            </View>
          </Surface>

          <Surface style={styles.chartCard}>
            <AppText style={styles.sectionTitle}>
              {t("outcomesOverTime")}
            </AppText>
            {metrics.total === 0 ? (
              <AppText variant="muted">{t("dashboardEmpty")}</AppText>
            ) : (
              <View style={styles.chart}>
                {metrics.periods.map((period) => {
                  const total = period.consumed + period.wasted;
                  const consumedWidth =
                    total === 0
                      ? 0
                      : (period.consumed / maximumPeriodTotal) * 100;
                  const wastedWidth =
                    total === 0
                      ? 0
                      : (period.wasted / maximumPeriodTotal) * 100;
                  return (
                    <View key={period.key} style={styles.chartRow}>
                      <AppText style={styles.chartLabel}>
                        {period.label}
                      </AppText>
                      <View
                        accessibilityLabel={`${period.label}: ${period.consumed} ${t("consumedMetric")}, ${period.wasted} ${t("wastedMetric")}`}
                        style={[
                          styles.chartTrack,
                          { backgroundColor: colors.border },
                        ]}
                      >
                        <View
                          style={[
                            styles.chartConsumed,
                            {
                              backgroundColor: colors.accent,
                              width: `${consumedWidth}%`,
                            },
                          ]}
                        />
                        <View
                          style={[
                            styles.chartWasted,
                            {
                              backgroundColor: colors.errorText,
                              width: `${wastedWidth}%`,
                            },
                          ]}
                        />
                      </View>
                      <AppText style={styles.chartValue}>{total}</AppText>
                    </View>
                  );
                })}
              </View>
            )}
          </Surface>
        </>
      ) : null}
      <OutcomeHistoryModal
        events={selectedEvents}
        onClose={() => setSelectedOutcome(null)}
        onRestore={restoreEvent}
        outcome={selectedOutcome}
      />
    </ScrollView>
  );
}

function MetricCard({
  label,
  value,
  color,
  onPress,
}: {
  label: string;
  value: number | string;
  color: string;
  onPress?: () => void;
}) {
  const content = (
    <Surface style={styles.metricCard}>
      <AppText style={[styles.metricValue, { color }]}>{value}</AppText>
      <AppText variant="muted">{label}</AppText>
    </Surface>
  );

  if (!onPress) return content;

  return (
    <Pressable
      accessibilityLabel={`${label}: ${value}`}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.metricCardPressable}
    >
      {content}
    </Pressable>
  );
}

function OutcomeHistoryModal({
  events,
  onClose,
  onRestore,
  outcome,
}: {
  events: PantryEvent[];
  onClose: () => void;
  onRestore: (id: string) => boolean;
  outcome: PantryEventOutcome | null;
}) {
  const t = useMessages();
  const { colors } = useTheme();

  return (
    <Modal
      accessibilityViewIsModal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={outcome !== null}
    >
      <View style={styles.modalBackdrop}>
        <View
          style={[
            styles.historySheet,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.historyHeader}>
            <View style={styles.historyTitleBlock}>
              <AppText accessibilityRole="header" style={styles.sectionTitle}>
                {outcome === "wasted"
                  ? t("wastedHistoryTitle")
                  : t("consumedHistoryTitle")}
              </AppText>
              <AppText variant="muted">
                {t("historyRestoreDescription")}
              </AppText>
            </View>
            <Pressable
              accessibilityLabel={t("close")}
              accessibilityRole="button"
              onPress={onClose}
              style={styles.closeButton}
            >
              <AppText style={styles.closeButtonText}>×</AppText>
            </Pressable>
          </View>

          <FlatList
            data={events}
            keyExtractor={(event) => event.id}
            ListEmptyComponent={
              <AppText style={styles.emptyHistory} variant="muted">
                {t("historyEmpty")}
              </AppText>
            }
            renderItem={({ item }) => (
              <View
                style={[styles.historyRow, { borderColor: colors.border }]}
              >
                <View style={styles.historyItemDetails}>
                  <AppText style={styles.historyItemName}>
                    {item.itemName}
                  </AppText>
                  <AppText variant="muted">
                    {formatOutcomeDate(item.occurredAt)}
                  </AppText>
                </View>
                {item.itemSnapshot ? (
                  <Button
                    accessibilityLabel={`${t("restoreToPantry")}: ${item.itemName}`}
                    onPress={() => onRestore(item.id)}
                    style={styles.restoreButton}
                  >
                    <ButtonText>{t("restoreToPantry")}</ButtonText>
                  </Button>
                ) : (
                  <AppText style={styles.unavailableText} variant="muted">
                    {t("restoreUnavailable")}
                  </AppText>
                )}
              </View>
            )}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </Modal>
  );
}

function formatOutcomeDate(timestamp: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <AppText variant="muted">{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  header: { paddingTop: spacing.lg, gap: spacing.xs },
  timeframeSelector: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 12,
    padding: 3,
    gap: 3,
  },
  timeframeButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
  },
  summaryGrid: { flexDirection: "row", gap: spacing.sm },
  metricCardPressable: { flex: 1 },
  metricCard: {
    minHeight: 104,
    justifyContent: "center",
    gap: spacing.xs,
  },
  metricValue: { fontSize: 28, lineHeight: 34, fontWeight: "700" },
  ratioCard: { gap: spacing.md },
  sectionTitle: { fontWeight: "700" },
  ratioTrack: { height: 18, borderRadius: 9, overflow: "hidden" },
  consumedRatio: { height: "100%" },
  legend: { flexDirection: "row", gap: spacing.lg },
  legendItem: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  chartCard: { gap: spacing.md },
  chart: { gap: spacing.sm },
  chartRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  chartLabel: { width: 50, fontSize: 13 },
  chartTrack: {
    flex: 1,
    height: 14,
    borderRadius: 7,
    overflow: "hidden",
    flexDirection: "row",
  },
  chartConsumed: { height: "100%" },
  chartWasted: { height: "100%" },
  chartValue: { width: 24, textAlign: "right", fontSize: 13 },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  historySheet: {
    maxHeight: "82%",
    minHeight: "35%",
    borderTopWidth: 1,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: spacing.md,
    gap: spacing.md,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  historyTitleBlock: { flex: 1, gap: spacing.xs },
  closeButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: { fontSize: 30, lineHeight: 34 },
  historyRow: {
    minHeight: 76,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  historyItemDetails: { flex: 1, gap: spacing.xs },
  historyItemName: { fontWeight: "600" },
  restoreButton: { minHeight: 44, paddingHorizontal: spacing.sm },
  unavailableText: { fontSize: 13, textAlign: "right", maxWidth: 100 },
  emptyHistory: { paddingVertical: spacing.lg, textAlign: "center" },
});
