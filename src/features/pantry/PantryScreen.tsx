import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { useMessages } from '@/i18n/useMessages';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { IngredientReference } from '@/features/recipes/ingredient';
import { useIngredientCatalog } from '@/features/recipes/useIngredientCatalog';

import { PantryEmptyState } from './PantryEmptyState';
import { PantryHeader } from './PantryHeader';
import { PantryItemFormModal } from './PantryItemFormModal';
import { PantryItemRow } from './PantryItemRow';
import { PantryLoadState } from './PantryLoadState';
import type { PantryItem } from './pantryItem';
import { usePantryItems } from './usePantryItems';

function keyExtractor(item: PantryItem) {
  return item.id;
}

function ItemSeparator() {
  return <View style={styles.separator} />;
}

export function PantryScreen() {
  const { items, status, hasSaveError, addItem, updateItem, retryLoad } = usePantryItems();
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const t = useMessages();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const ingredientCatalog = useIngredientCatalog(isFormVisible);

  const editingItem = items.find((item) => item.id === editingItemId);

  function handleOpenForm() {
    setEditingItemId(null);
    setIsFormVisible(true);
  }

  const handleEdit = useCallback((id: string) => {
    setEditingItemId(id);
    setIsFormVisible(true);
  }, []);

  function handleCloseForm() {
    setIsFormVisible(false);
    setEditingItemId(null);
  }

  function handleSave(name: string, expirationDate: string, recipeIngredient: IngredientReference | null) {
    const draft = { name, expirationDate, recipeIngredient };
    if (editingItemId) updateItem(editingItemId, draft);
    else addItem(draft);
    setIsFormVisible(false);
    setEditingItemId(null);
  }

  const renderItem = useCallback(({ item }: ListRenderItemInfo<PantryItem>) => (
    <PantryItemRow
      expirationDate={item.expirationDate}
      id={item.id}
      name={item.name}
      onEdit={handleEdit}
    />
  ), [handleEdit]);

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
          <PantryHeader hasSaveError={hasSaveError} />
        }
        renderItem={renderItem}
      />
      {status === 'ready' ? (
        <Pressable
          accessibilityLabel={t('addFood')}
          accessibilityRole="button"
          onPress={handleOpenForm}
          style={[
            styles.addButton,
            {
              backgroundColor: colors.accent,
              bottom: insets.bottom + spacing.md,
              right: insets.right + spacing.md,
            },
          ]}
        >
          <AppText accessible={false} style={[styles.addButtonText, { color: colors.accentText }]}>
            +
          </AppText>
        </Pressable>
      ) : null}
      <PantryItemFormModal
        initialExpirationDate={editingItem?.expirationDate}
        initialName={editingItem?.name}
        initialRecipeIngredient={editingItem?.recipeIngredient}
        ingredientCatalog={ingredientCatalog.items}
        ingredientCatalogStatus={ingredientCatalog.status}
        isVisible={isFormVisible}
        mode={editingItemId ? 'edit' : 'add'}
        onCancel={handleCloseForm}
        onSave={handleSave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: 56 + spacing.xl },
  separator: { height: spacing.sm },
  addButton: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.24)',
  },
  addButtonText: { fontSize: 32, lineHeight: 36, fontWeight: '400' },
});
