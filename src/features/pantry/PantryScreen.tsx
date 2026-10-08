import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { UndoSnackbar } from '@/components/ui/UndoSnackbar';
import type { MessageKey } from '@/i18n/messages';
import { useMessages } from '@/i18n/useMessages';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { IngredientReference } from '@/features/recipes/ingredient';
import { useIngredientCatalog } from '@/features/recipes/useIngredientCatalog';

import { PantryEmptyState } from './PantryEmptyState';
import { PantryHeader } from './PantryHeader';
import { PantryItemModal, type PantryModalState } from './PantryItemModal';
import { PantryItemRow } from './PantryItemRow';
import { PantryLoadState } from './PantryLoadState';
import type { PantryItem } from './pantryItem';
import { usePantry, type PantryState } from './PantryContext';
import { sortPantryItemsByExpiration } from './sortPantryItems';
import { usePantryItems } from './usePantryItems';

function keyExtractor(item: PantryItem) {
  return item.id;
}

function ItemSeparator() {
  return <View style={styles.separator} />;
}

/**
 * Coordinates the pantry list, item modal, and queued Undo confirmations.
 *
 * @returns The main pantry screen.
 */
export function PantryScreen() {
  return <PantryScreenView pantry={usePantryItems()} />;
}

/**
 * Connects the pantry screen to the shared application pantry state.
 *
 * @returns The pantry screen used by the tab route.
 */
export function ConnectedPantryScreen() {
  return <PantryScreenView pantry={usePantry()} />;
}

function PantryScreenView({ pantry }: { pantry: PantryState }) {
  const {
    items, status, hasSaveError, failedActionIds, addItem, updateItem,
    consumeItem, wasteItem, undoAction, finalizeAction, retryLoad,
  } = pantry;
  const [modalState, setModalState] = useState<PantryModalState>(null);
  const [feedbackQueue, setFeedbackQueue] = useState<{ id: string; messageKey: MessageKey }[]>([]);
  const t = useMessages();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const sortedItems = useMemo(() => sortPantryItemsByExpiration(items), [items]);
  const ingredientCatalog = useIngredientCatalog(modalState?.mode === 'add' || modalState?.mode === 'edit');

  const selectedItem = modalState && 'itemId' in modalState
    ? items.find((item) => item.id === modalState.itemId) : undefined;
  const currentFeedback = feedbackQueue[0];

  function handleOpenForm() {
    setModalState({ mode: 'add' });
  }

  const handleOpenDetails = useCallback((itemId: string) => {
    setModalState({ mode: 'details', itemId });
  }, []);

  function handleEdit() {
    if (modalState && 'itemId' in modalState) setModalState({ mode: 'edit', itemId: modalState.itemId });
  }

  function handleCloseModal() { setModalState(null); }

  function handleConsume() {
    if (!selectedItem) return;
    const actionId = consumeItem(selectedItem.id);
    if (actionId) setFeedbackQueue((queue) => [...queue, { id: actionId, messageKey: 'foodConsumed' }]);
    setModalState(null);
  }

  function handleWaste() {
    if (!selectedItem) return;
    const actionId = wasteItem(selectedItem.id);
    if (actionId) setFeedbackQueue((queue) => [...queue, { id: actionId, messageKey: 'foodWasted' }]);
    setModalState(null);
  }

  function handleFeedbackDismiss(reason: 'expired' | 'undo') {
    if (!currentFeedback) return;
    if (reason === 'undo') undoAction(currentFeedback.id);
    else finalizeAction(currentFeedback.id);
    setFeedbackQueue((queue) => queue.slice(1));
  }

  /**
   * Opens recipes matching the ingredient linked to a pantry item.
   *
   * @param ingredient - The canonical TheMealDB ingredient stored with the pantry item.
   */
  const handleFindRecipes = useCallback((ingredient: IngredientReference) => {
    setModalState(null);
    router.push({ pathname: '/recipes/[ingredient]' as never, params: { ingredient: ingredient.name } });
  }, []);

  function handleSave(name: string, expirationDate: string, recipeIngredient: IngredientReference | null) {
    const draft = { name, expirationDate, recipeIngredient };
    if (modalState?.mode === 'edit') {
      const actionId = updateItem(modalState.itemId, draft);
      if (actionId) setFeedbackQueue((queue) => [...queue, { id: actionId, messageKey: 'foodUpdated' }]);
    } else addItem(draft);
    setModalState(null);
  }

  const renderItem = useCallback(({ item }: ListRenderItemInfo<PantryItem>) => (
    <PantryItemRow
      expirationDate={item.expirationDate}
      id={item.id}
      name={item.name}
      onOpen={handleOpenDetails}
    />
  ), [handleOpenDetails]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlashList
        contentContainerStyle={[styles.listContent, currentFeedback ? styles.listContentWithFeedback : null]}
        contentInsetAdjustmentBehavior="automatic"
        data={sortedItems}
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
              bottom: insets.bottom + (currentFeedback ? 88 : spacing.md),
              right: insets.right + spacing.md,
            },
          ]}
        >
          <AppText accessible={false} style={[styles.addButtonText, { color: colors.accentText }]}>
            +
          </AppText>
        </Pressable>
      ) : null}
      {currentFeedback ? (
        <UndoSnackbar
          key={currentFeedback.id}
          bottom={insets.bottom + spacing.md}
          isError={failedActionIds.includes(currentFeedback.id)}
          message={t(failedActionIds.includes(currentFeedback.id) ? 'pantryChangeSaveError' : currentFeedback.messageKey)}
          onDismiss={handleFeedbackDismiss}
        />
      ) : null}
      <PantryItemModal
        state={modalState}
        item={selectedItem}
        ingredientCatalog={ingredientCatalog.items}
        ingredientCatalogStatus={ingredientCatalog.status}
        onClose={handleCloseModal}
        onConsume={handleConsume}
        onEdit={handleEdit}
        onFindRecipes={handleFindRecipes}
        onSave={handleSave}
        onWaste={handleWaste}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: 56 + spacing.xl },
  listContentWithFeedback: { paddingBottom: 152 },
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
