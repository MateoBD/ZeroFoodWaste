import { Stack } from 'expo-router';
import { BarcodeScannerScreen } from '@/features/pantry/BarcodeScannerScreen';

export default function ScanBarcodeRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <BarcodeScannerScreen />
    </>
  );
}
