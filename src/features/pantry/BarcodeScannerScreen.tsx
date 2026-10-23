import BottomSheet, { BottomSheetScrollView, useBottomSheetTimingConfigs } from '@gorhom/bottom-sheet';
import type { BottomSheetScrollViewMethods } from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { Easing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button, ButtonText } from '@/components/ui/Button';
import { openFoodFactsProvider } from '@/features/barcode/api/openFoodFactsClient';
import type { IngredientReference } from '@/features/recipes/ingredient';
import { useIngredientCatalog } from '@/features/recipes/useIngredientCatalog';
import { useMessages } from '@/i18n/useMessages';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { PantryItemForm } from './PantryItemForm';
import { usePantry } from './PantryContext';

/**
 * Shows a live barcode camera behind a draggable manual entry sheet.
 *
 * A successful lookup fills the editable form and expands the sheet. The
 * camera pauses once a user starts editing so it cannot replace a draft.
 *
 * @returns The scan-first add food screen.
 */
export function BarcodeScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanEnabled, setScanEnabled] = useState(true);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [lookupError, setLookupError] = useState<'not-found' | 'unavailable' | null>(null);
  const [scannedName, setScannedName] = useState('');
  const [scannedCandidates, setScannedCandidates] = useState<readonly string[]>([]);
  const [scanVersion, setScanVersion] = useState(0);
  const permissionRequested = useRef(false);
  const processingRef = useRef(false);
  const scanEnabledRef = useRef(true);
  const scanSessionRef = useRef(0);
  const leavingRef = useRef(false);
  const sheetRef = useRef<BottomSheet>(null);
  const scrollRef = useRef<BottomSheetScrollViewMethods>(null);
  const formOffset = useRef(0);
  const recipeOffset = useRef(0);
  const recipeFocused = useRef(false);
  const { addItem } = usePantry();
  const ingredientCatalog = useIngredientCatalog(true);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const t = useMessages();
  const sheetAnimation = useBottomSheetTimingConfigs({
    duration: 420,
    easing: Easing.inOut(Easing.cubic),
  });

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain && !permissionRequested.current) {
      permissionRequested.current = true;
      void requestPermission().catch(() => undefined);
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    const listener = Keyboard.addListener('keyboardDidShow', () => {
      if (recipeFocused.current) scrollToRecipeIngredient();
    });
    return () => listener.remove();
  }, []);

  function scrollToRecipeIngredient() {
    scrollRef.current?.scrollTo({ y: Math.max(0, formOffset.current + recipeOffset.current - spacing.md), animated: true });
  }

  function pauseScanning() {
    if (!scanEnabledRef.current) return;
    scanEnabledRef.current = false;
    scanSessionRef.current += 1;
    processingRef.current = false;
    setScanEnabled(false);
    setIsProcessing(false);
  }

  function expandForManualEntry() {
    pauseScanning();
    setSheetExpanded(true);
    sheetRef.current?.snapToIndex(1);
  }

  function resumeScanning() {
    if (scanEnabledRef.current) return;
    setLookupError(null);
    scanEnabledRef.current = true;
    scanSessionRef.current += 1;
    processingRef.current = false;
    setScanEnabled(true);
    setIsProcessing(false);
  }

  async function handleBarcodeScanned({ data }: { data: string }) {
    if (processingRef.current || !scanEnabledRef.current) return;
    const scanSession = scanSessionRef.current;
    processingRef.current = true;
    setIsProcessing(true);
    try {
      const product = await openFoodFactsProvider.getByBarcode(data);
      if (scanSession !== scanSessionRef.current) return;
      if (product?.name) {
        setScannedName(product.name);
        setScannedCandidates(product.recipeIngredientCandidates);
        setScanVersion((version) => version + 1);
        setLookupError(null);
      } else {
        setLookupError('not-found');
      }
      expandForManualEntry();
    } catch {
      if (scanSession === scanSessionRef.current) {
        setLookupError('unavailable');
        expandForManualEntry();
      }
    } finally {
      if (scanSession === scanSessionRef.current) {
        processingRef.current = false;
        setIsProcessing(false);
      }
    }
  }

  function closeAddScreen() {
    if (leavingRef.current) return;
    leavingRef.current = true;
    router.back();
  }

  function handleSave(name: string, expirationDate: string, recipeIngredient: IngredientReference | null, quantity: number) {
    addItem({ name, expirationDate, recipeIngredient, quantity });
    closeAddScreen();
  }

  const cameraAvailable = permission?.granted === true;
  const permissionNeedsManualEntry = Boolean(permission && !permission.granted && !permission.canAskAgain);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {cameraAvailable ? (
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={scanEnabled && !isProcessing ? handleBarcodeScanned : undefined}
        />
      ) : (
        <View style={[styles.camera, styles.cameraUnavailable, { backgroundColor: colors.surface }]}>
          <AppText style={styles.cameraMessage}>{t('cameraPermissionRequired')}</AppText>
          {permission?.canAskAgain ? (
            <Button onPress={requestPermission}>
              <ButtonText>{t('grantCameraPermission')}</ButtonText>
            </Button>
          ) : null}
        </View>
      )}
      {!sheetExpanded && !permissionNeedsManualEntry ? (
        <View
          nativeID="safe-area-scanner-controls"
          style={[styles.cameraControls, { top: insets.top + spacing.sm }]}
        >
        <Pressable
          accessibilityLabel={t('close')}
          accessibilityRole="button"
          onPress={closeAddScreen}
          style={[styles.closeButton, { backgroundColor: colors.background }]}
        >
          <AppText>{t('close')}</AppText>
        </Pressable>
        </View>
      ) : null}
      {isProcessing ? (
        <View style={styles.scanStatus}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : null}
      <BottomSheet
        ref={sheetRef}
        index={permissionNeedsManualEntry ? 1 : 0}
        snapPoints={['50%', '100%']}
        topInset={insets.top}
        enableDynamicSizing={false}
        enableContentPanningGesture={false}
        animationConfigs={sheetAnimation}
        keyboardBehavior="fillParent"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        backgroundStyle={{ backgroundColor: colors.background }}
        handleStyle={styles.sheetHandle}
        handleIndicatorStyle={{ backgroundColor: colors.mutedText }}
        onAnimate={(_fromIndex, toIndex) => {
          if (toIndex === 1) setSheetExpanded(true);
        }}
        onChange={(index) => {
          if (index === 1) {
            setSheetExpanded(true);
            pauseScanning();
          } else if (index === 0) {
            setSheetExpanded(false);
            if (cameraAvailable) resumeScanning();
          }
        }}
      >
        <BottomSheetScrollView
          ref={scrollRef}
          contentContainerStyle={styles.sheetContent}
          contentInsetAdjustmentBehavior="automatic"
          keyboardDismissMode="none"
          keyboardShouldPersistTaps="always"
        >
          <AppText accessibilityRole="header" variant="title">{t('addFood')}</AppText>
          <AppText variant="muted">
            {t(!cameraAvailable ? 'enterManually' : scanEnabled ? 'scanOrEnterManually' : 'slideDownToScan')}
          </AppText>
          {lookupError ? (
            <AppText accessibilityLiveRegion="polite" variant="error">
              {t(lookupError === 'not-found' ? 'productNotFound' : 'productLookupUnavailable')}
            </AppText>
          ) : null}
          <PantryItemForm
            key={scanVersion}
            initialName={scannedName}
            initialRecipeIngredientCandidates={scanVersion > 0 ? scannedCandidates : undefined}
            ingredientCatalog={ingredientCatalog.items}
            ingredientCatalogStatus={ingredientCatalog.status}
            isEditing={false}
            useSheetInputs
            onBeginManualEntry={expandForManualEntry}
            onFormLayout={(event) => { formOffset.current = event.nativeEvent.layout.y; }}
            onRecipeSectionLayout={(event) => {
              recipeOffset.current = event.nativeEvent.layout.y;
              if (recipeFocused.current) scrollToRecipeIngredient();
            }}
            onRecipeFocus={() => {
              recipeFocused.current = true;
              scrollToRecipeIngredient();
            }}
            onRecipeBlur={() => { recipeFocused.current = false; }}
            onCancel={closeAddScreen}
            onSave={handleSave}
          />
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  camera: { flex: 1 },
  cameraUnavailable: { alignItems: 'center', justifyContent: 'flex-start', paddingTop: 120, gap: spacing.md },
  cameraMessage: { textAlign: 'center', paddingHorizontal: spacing.lg },
  cameraControls: { position: 'absolute', left: spacing.md, right: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  closeButton: { minHeight: 48, paddingHorizontal: spacing.md, borderRadius: 12, justifyContent: 'center' },
  scanStatus: { position: 'absolute', top: '25%', alignSelf: 'center' },
  sheetHandle: { minHeight: 48, justifyContent: 'center' },
  sheetContent: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
});
