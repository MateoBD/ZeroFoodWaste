import { CameraView, useCameraPermissions } from 'expo-camera';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button, ButtonText } from '@/components/ui/Button';
import { useMessages } from '@/i18n/useMessages';

/**
 * Lets the user scan a product barcode using the device camera.
 */
export function BarcodeScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const t = useMessages();

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
      <CameraView style={styles.camera} facing="back" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
});