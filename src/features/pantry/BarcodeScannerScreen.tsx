import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { Button, ButtonText } from '@/components/ui/Button';
import { useMessages } from '@/i18n/useMessages';
import { openFoodFactsProvider } from '@/features/barcode/api/openFoodFactsClient';

/**
 * Lets the user scan a product barcode using the device camera.
 */
export function BarcodeScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const t = useMessages();

  async function handleBarcodeScanned({ data }: { data: string }) {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const product = await openFoodFactsProvider.getByBarcode(data);
      if (product?.name) {
        router.dismissTo({ pathname: '/', params: { scannedName: product.name } });
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setIsProcessing(false);
    }
  }

  if (!permission) {
    return <View style={styles.center} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <AppText>{t('cameraPermissionRequired')}</AppText>
        <Button onPress={requestPermission}>
          <ButtonText>{t('grantCameraPermission')}</ButtonText>
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={isProcessing || notFound ? undefined : handleBarcodeScanned}
      />
      {isProcessing ? (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      ) : null}
      {notFound ? (
        <View style={styles.overlay}>
          <AppText style={styles.overlayText}>{t('productNotFound')}</AppText>
          <Button onPress={() => setNotFound(false)}>
            <ButtonText>{t('scanAgain')}</ButtonText>
          </Button>
          <Button onPress={() => router.dismissTo({ pathname: '/', params: { manualEntry: '1' } })}>
            <ButtonText>{t('enterManually')}</ButtonText>
          </Button>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayText: { color: '#ffffff', textAlign: 'center', paddingHorizontal: 24 },
});