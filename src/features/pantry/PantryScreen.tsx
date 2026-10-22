import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { usePantryItems, type PantryItemDraft } from './usePantryItems';
import {
  EXPIRATION_NOTIFICATION_TYPE,
  addExpirationNotificationResponseListener,
  getLastExpirationNotificationResponse,
  supportsExpirationNotifications,
  type ExpirationNotificationResponse,
} from '@/features/notifications/expirationNotifications';

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
    items, status, hasSaveError, failedActionIds, updateItem,
    consumeItem, wasteItem, undoAction, finalizeAction, retryLoad,
  } = pantry;
  const [modalState, setModalState] = useState<PantryModalState>(null);
  const [pendingZeroDraft, setPendingZeroDraft] = useState<{
    draft: PantryItemDraft;
    consumedUnits: number;
  } | null>(null);
  const [feedbackQueue, setFeedbackQueue] = useState<{ id: string; messageKey: MessageKey }[]>([]);
  const [notificationItemId, setNotificationItemId] = useState<string | undefined>(undefined);

  // Wait until pantry data is ready, then open the item referenced by a tapped
  // expiration notification. The deferred callback avoids updating modal state
  // during the notification-response effect itself; stale item IDs are ignored.
  useEffect(() => {
    if (!supportsExpirationNotifications()) return;

    /**
     * Extracts a pantry item identifier from a notification response.
     *
     * @param response - The native notification response received after a tap.
     * @returns Nothing; a valid identifier is queued for modal opening.
     */
    function handleNotificationResponse(response: ExpirationNotificationResponse) {
      const data = response.notification.request.content.data;
      if (data?.type !== EXPIRATION_NOTIFICATION_TYPE || typeof data.itemId !== 'string') return;
      setNotificationItemId(data.itemId);
    }

    const subscription = addExpirationNotificationResponseListener(handleNotificationResponse);
    try {
      const response = getLastExpirationNotificationResponse();
      if (response) handleNotificationResponse(response);
    } catch {
      // Notification access can be unavailable in unsupported runtimes.
    }
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    if (status !== 'ready' || !notificationItemId) return;
    const itemId = notificationItemId;
    const timer = setTimeout(() => {
      if (items.some((item) => item.id === itemId)) setModalState({ mode: 'details', itemId });
      setNotificationItemId(undefined);
    }, 0);
    return () => clearTimeout(timer);
  }, [items, notificationItemId, status]);
  const t = useMessages();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const sortedItems = useMemo(() => sortPantryItemsByExpiration(items), [items]);
  const ingredientCatalog = useIngredientCatalog(modalState?.mode === 'edit');

  const selectedItem = modalState && 'itemId' in modalState
    ? items.find((item) => item.id === modalState.itemId) : undefined;
  const currentFeedback = feedbackQueue[0];

  const handleOpenDetails = useCallback((itemId: string) => {
    setModalState({ mode: 'details', itemId });
  }, []);

  function handleEdit() {
    if (modalState && 'itemId' in modalState) setModalState({ mode: 'edit', itemId: modalState.itemId });
  }

  function handleCloseModal() {
    setPendingZeroDraft(null);
    setModalState(null);
  }

  function handleConsume(amount: number) {
    if (!selectedItem) return;
    if (amount === 0) {
      setModalState({ mode: 'consume', itemId: selectedItem.id });
      return;
    }
    const actionId = consumeItem(selectedItem.id, amount);
    if (actionId) setFeedbackQueue((queue) => [...queue, { id: actionId, messageKey: 'foodConsumed' }]);
    setModalState(null);
  }

  function handleWaste() {
    if (!selectedItem) return;
    if (modalState?.mode !== 'confirm-waste') {
      setModalState({ mode: 'confirm-waste', itemId: selectedItem.id });
      return;
    }
    const actionId = wasteItem(selectedItem.id);
    if (actionId) setFeedbackQueue((queue) => [...queue, { id: actionId, messageKey: 'foodWasted' }]);
    setModalState(null);
  }

  function handleFeedbackDismiss(reason: 'expired' | 'action') {
    if (!currentFeedback) return;
    if (reason === 'action') undoAction(currentFeedback.id);
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

  function handleSave(
    name: string,
    expirationDate: string,
    recipeIngredient: IngredientReference | null,
    quantity: number,
    consumedUnits: number,
  ) {
    const draft = { name, expirationDate, recipeIngredient, quantity };
    if (modalState?.mode === 'edit') {
      if (quantity === 0 && selectedItem) {
        setPendingZeroDraft({
          draft,
          consumedUnits: consumedUnits > 0 ? consumedUnits : selectedItem.quantity,
        });
        setModalState({ mode: 'confirm-zero', itemId: modalState.itemId });
        return;
      }
      const actionId = updateItem(modalState.itemId, draft, consumedUnits);
      if (actionId) setFeedbackQueue((queue) => [...queue, {
        id: actionId,
        messageKey: consumedUnits > 0 ? 'foodConsumed' : 'foodUpdated',
      }]);
    }
    setModalState(null);
  }

  function handleConfirmZero() {
    if (!selectedItem || !pendingZeroDraft) return;
    const actionId = updateItem(
      selectedItem.id,
      pendingZeroDraft.draft,
      pendingZeroDraft.consumedUnits,
    );
    if (actionId) setFeedbackQueue((queue) => [...queue, { id: actionId, messageKey: 'foodConsumed' }]);
    setPendingZeroDraft(null);
    setModalState(null);
  }

  const renderItem = useCallback(({ item }: ListRenderItemInfo<PantryItem>) => (
    <PantryItemRow
      expirationDate={item.expirationDate}
      id={item.id}
      name={item.name}
      quantity={item.quantity}
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
          onPress={() => router.push('/scan-barcode')}
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
        onConfirmZero={handleConfirmZero}
        onEdit={handleEdit}
        onFindRecipes={handleFindRecipes}
        onSave={handleSave}
        onWaste={handleWaste}
        zeroConsumedUnits={pendingZeroDraft?.consumedUnits ?? selectedItem?.quantity ?? 0}
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
