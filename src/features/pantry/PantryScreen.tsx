import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { PantryEmptyState } from './PantryEmptyState';
import { PantryHeader } from './PantryHeader';
import { PantryItemRow } from './PantryItemRow';
import { PantryLoadState } from './PantryLoadState';
import type { PantryItem } from './pantryItem';
import { usePantryItems } from './usePantryItems';

function keyExtractor(item: PantryItem) {
  return item.id;
}

function renderItem({ item }: ListRenderItemInfo<PantryItem>) {
  return <PantryItemRow expirationDate={item.expirationDate} name={item.name} />;
}

function ItemSeparator() {
  return <View style={styles.separator} />;
}

export function PantryScreen() {
  const { items, status, hasSaveError, addItem, retryLoad } = usePantryItems();
  const [isFormVisible, setIsFormVisible] = useState(false);
  const { colors } = useTheme();

  function handleToggleForm() {
    setIsFormVisible((isVisible) => !isVisible);
  }

  function handleSave(name: string, expirationDate: string) {
    addItem(name, expirationDate);
    setIsFormVisible(false);
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlashList
        contentContainerStyle={styles.listContent}
        contentInsetAdjustmentBehavior="automatic"
        data={items}
        ItemSeparatorComponent={ItemSeparator}
        keyExtractor={keyExtractor}
        ListEmptyComponent={
          status === 'ready' ? PantryEmptyState : <PantryLoadState onRetry={retryLoad} status={status} />
        }
        ListHeaderComponent={
          <PantryHeader
            canAddItems={status === 'ready'}
            hasSaveError={hasSaveError}
            isFormVisible={isFormVisible}
            onSave={handleSave}
            onToggleForm={handleToggleForm}
          />
        }
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  separator: { height: spacing.sm },
});
