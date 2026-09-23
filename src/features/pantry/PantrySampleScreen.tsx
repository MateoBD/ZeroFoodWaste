import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button, ButtonText } from '@/components/ui/Button';
import { Surface } from '@/components/ui/Surface';
import { useMessages } from '@/i18n/useMessages';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { sampleFoods, type SampleFood } from './sampleFoods';

function keyExtractor(item: SampleFood) {
  return item.id;
}

export function PantrySampleScreen() {
  const [showExamples, setShowExamples] = useState(true);
  const [groceries, setGroceries] = useState<{ id: string; name: string }[]>([]);
  const t = useMessages();
  const { colors } = useTheme();
  const buttonLabel = t(showExamples ? 'hideExamples' : 'showExamples');

  function renderItem({ item }: ListRenderItemInfo<SampleFood>) {
    return (
      <Surface
        style={styles.row}
        accessible
        accessibilityLabel={`${t('exampleTag')}: ${t(item.nameKey)}`}
      >
        <View style={styles.rowText}>
          <AppText style={styles.foodName}>{t(item.nameKey)}</AppText>
          <AppText variant="muted">{t('exampleTag')}</AppText>
        </View>
      </Surface>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlashList
        data={showExamples ? sampleFoods : []}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <AppText variant="title" accessibilityRole="header">{t('screenTitle')}</AppText>
            <AppText variant="muted">{t('sampleNotice')}</AppText>
            <Button
              onPress={() => setShowExamples((value) => !value)}
              accessibilityLabel={buttonLabel}
              accessibilityState={{ expanded: showExamples }}
            >
              <ButtonText>{buttonLabel}</ButtonText>
            </Button>
            <Button onPress={() => console.log('Button + pressed')}>
              <ButtonText>+ Add food</ButtonText>
            </Button>
            <AppText accessibilityRole="header" style={styles.sectionTitle}>
              {t('sampleHeading')}
            </AppText>
          </View>
        }
        ListEmptyComponent={<AppText variant="muted">{t('emptyExamples')}</AppText>}
        ItemSeparatorComponent={ItemSeparator}
      />
    </View>
  );
}

function ItemSeparator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  header: { paddingTop: spacing.lg, paddingBottom: spacing.md, gap: spacing.md },
  sectionTitle: { fontWeight: '700' },
  row: { minHeight: 76, justifyContent: 'center' },
  rowText: { gap: spacing.xs },
  foodName: { fontWeight: '600' },
  separator: { height: spacing.sm },
});
