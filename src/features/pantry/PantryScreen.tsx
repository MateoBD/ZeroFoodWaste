import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { PantryEmptyState } from './PantryEmptyState';
import { PantryHeader } from './PantryHeader';
import { PantryItemRow } from './PantryItemRow';

// Temporary UI record for this mounted screen only. This is not the future
// persisted pantry domain model.
type SessionPantryItem = Readonly<{
  expirationDate: string;
  id: string;
  name: string;
}>;

function keyExtractor(item: SessionPantryItem) {
  return item.id;
}

function renderItem({ item }: ListRenderItemInfo<SessionPantryItem>) {
  return <PantryItemRow expirationDate={item.expirationDate} name={item.name} />;
}

function ItemSeparator() {
  return <View style={styles.separator} />;
}

export function PantryScreen() {
  const [items, setItems] = useState<SessionPantryItem[]>([]);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const nextItemId = useRef(1);
  const { colors } = useTheme();

  function handleToggleForm() {
    setIsFormVisible((isVisible) => !isVisible);
  }

  function handleSave(name: string, expirationDate: string) {
    const item: SessionPantryItem = {
      expirationDate,
      id: `session-item-${nextItemId.current}`,
      name,
    };

    nextItemId.current += 1;
    setItems((currentItems) => [...currentItems, item]);
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
        ListEmptyComponent={PantryEmptyState}
        ListHeaderComponent={
          <PantryHeader
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
